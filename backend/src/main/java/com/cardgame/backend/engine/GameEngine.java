package com.cardgame.backend.engine;

import com.cardgame.backend.exception.InvalidPlayException;
import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.GameSession;
import com.cardgame.backend.model.TrickPlay;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Component
public class GameEngine {
    public List<Card> legalCards(GameSession session, int seat) {
        List<Card> hand = session.handForSeat(seat);
        if (session.currentTrickView().isEmpty()) {
            return List.copyOf(hand);
        }
        Card leadCard = session.currentTrickView().getFirst().card();
        List<Card> matching = hand.stream()
            .filter(card -> TrumpEvaluator.followsLeadGroup(leadCard, card, session.gameType(), session.soloSuit()))
            .toList();
        if (matching.isEmpty()) {
            return List.copyOf(hand);
        }
        return matching;
    }

    public Card playByCardIndex(GameSession session, int seat, int cardIndex) {
        List<Card> hand = session.handForSeat(seat);
        if (cardIndex < 0 || cardIndex >= hand.size()) {
            throw new InvalidPlayException("cardIndex out of range");
        }
        Card card = hand.get(cardIndex);
        return playCard(session, seat, card);
    }

    public Card playCard(GameSession session, int seat, Card card) {
        if (session.roundComplete()) {
            throw new InvalidPlayException("Round is already complete");
        }
        if (session.currentSeat() != seat) {
            throw new InvalidPlayException("It is not seat " + seat + " turn");
        }
        List<Card> legal = legalCards(session, seat);
        if (!legal.contains(card)) {
            throw new InvalidPlayException("Card does not satisfy follow-suit rule");
        }
        session.playCard(seat, card);
        if (session.currentTrickView().size() == 4) {
            settleTrick(session);
        }
        return card;
    }

    public void settleTrick(GameSession session) {
        List<TrickPlay> trick = new ArrayList<>(session.currentTrickView());
        int winner = TrickResolver.determineTrickWinner(trick, session.gameType(), session.soloSuit());
        int points = TrickResolver.countTrickPoints(trick);
        session.settleCurrentTrick(winner, points);
    }

    public Card highestTrump(List<Card> cards, GameSession session) {
        return cards.stream()
            .filter(card -> TrumpEvaluator.isTrump(card, session.gameType(), session.soloSuit()))
            .max(Comparator.comparingInt(card -> TrumpEvaluator.scoreTrump(card, session.gameType(), session.soloSuit())))
            .orElse(null);
    }
}