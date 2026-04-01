package com.cardgame.backend.bot;

import com.cardgame.backend.engine.TrickResolver;
import com.cardgame.backend.engine.TrumpEvaluator;
import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.GameSession;
import com.cardgame.backend.model.TrickPlay;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class HeuristicBotStrategy implements BotStrategy {
    @Override
    public Card selectCard(GameSession session, int botSeat, List<Card> legalCards) {
        if (legalCards.isEmpty()) {
            throw new IllegalArgumentException("No legal cards available");
        }
        if (legalCards.size() == 1) {
            return legalCards.getFirst();
        }
        if (session.currentTrickView().isEmpty()) {
            return selectLeadCard(session, botSeat, legalCards);
        }
        return selectFollowingCard(session, legalCards);
    }

    private Card selectLeadCard(GameSession session, int botSeat, List<Card> legalCards) {
        long trumpCount = session.handForSeat(botSeat).stream()
            .filter(card -> TrumpEvaluator.isTrump(card, session.gameType(), session.soloSuit()))
            .count();

        if (trumpCount > 3) {
            return legalCards.stream()
                .filter(card -> TrumpEvaluator.isTrump(card, session.gameType(), session.soloSuit()))
                .max(Comparator.comparingInt(card -> TrumpEvaluator.scoreTrump(card, session.gameType(), session.soloSuit())))
                .orElseGet(() -> highestNonTrumpOrStrongest(session, legalCards));
        }
        return highestNonTrumpOrStrongest(session, legalCards);
    }

    private Card highestNonTrumpOrStrongest(GameSession session, List<Card> legalCards) {
        return legalCards.stream()
            .filter(card -> !TrumpEvaluator.isTrump(card, session.gameType(), session.soloSuit()))
            .max(Comparator.comparingInt(TrumpEvaluator::scorePlain))
            .orElseGet(() -> legalCards.stream()
                .max(Comparator.comparingInt(card -> TrumpEvaluator.scoreTrump(card, session.gameType(), session.soloSuit())))
                .orElseThrow());
    }

    private Card selectFollowingCard(GameSession session, List<Card> legalCards) {
        TrickPlay currentWinner = TrickResolver.determineWinningPlay(
            session.currentTrickView(), session.gameType(), session.soloSuit()
        );
        Card leadCard = session.currentTrickView().getFirst().card();

        List<Card> winningTrumps = legalCards.stream()
            .filter(card -> TrumpEvaluator.isTrump(card, session.gameType(), session.soloSuit()))
            .filter(card -> TrickResolver.beats(card, currentWinner.card(), leadCard, session.gameType(), session.soloSuit()))
            .sorted(Comparator.comparingInt(card -> TrumpEvaluator.scoreTrump(card, session.gameType(), session.soloSuit())))
            .toList();
        if (!winningTrumps.isEmpty()) {
            return winningTrumps.getFirst();
        }

        return legalCards.stream()
            .min(Comparator
                .comparingInt(TrumpEvaluator::points)
                .thenComparingInt(card -> cardStrengthAscending(session, card)))
            .orElseThrow();
    }

    private int cardStrengthAscending(GameSession session, Card card) {
        if (TrumpEvaluator.isTrump(card, session.gameType(), session.soloSuit())) {
            return TrumpEvaluator.scoreTrump(card, session.gameType(), session.soloSuit());
        }
        return TrumpEvaluator.scorePlain(card);
    }
}