package com.cardgame.backend.engine;

import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.GameType;
import com.cardgame.backend.model.Suit;
import com.cardgame.backend.model.TrickPlay;

import java.util.List;

public final class TrickResolver {
    private TrickResolver() {
    }

    public static int determineTrickWinner(List<TrickPlay> trick, GameType gameType, Suit soloSuit) {
        if (trick.size() != 4) {
            throw new IllegalArgumentException("Trick must contain exactly 4 cards");
        }
        return determineWinningPlay(trick, gameType, soloSuit).seat();
    }

    public static TrickPlay determineWinningPlay(List<TrickPlay> trick, GameType gameType, Suit soloSuit) {
        if (trick.isEmpty()) {
            throw new IllegalArgumentException("Trick must contain at least 1 card");
        }
        Card leadCard = trick.getFirst().card();
        TrickPlay best = trick.getFirst();
        for (int i = 1; i < trick.size(); i++) {
            TrickPlay candidate = trick.get(i);
            if (beats(candidate.card(), best.card(), leadCard, gameType, soloSuit)) {
                best = candidate;
            }
        }
        return best;
    }

    public static boolean beats(Card candidate, Card currentWinner, Card leadCard, GameType gameType, Suit soloSuit) {
        boolean candidateTrump = TrumpEvaluator.isTrump(candidate, gameType, soloSuit);
        boolean winnerTrump = TrumpEvaluator.isTrump(currentWinner, gameType, soloSuit);

        if (candidateTrump && !winnerTrump) {
            return true;
        }
        if (!candidateTrump && winnerTrump) {
            return false;
        }
        if (candidateTrump) {
            return TrumpEvaluator.scoreTrump(candidate, gameType, soloSuit)
                > TrumpEvaluator.scoreTrump(currentWinner, gameType, soloSuit);
        }

        Suit leadSuit = leadCard.suit();
        boolean candidateLeadSuit = candidate.suit() == leadSuit;
        boolean winnerLeadSuit = currentWinner.suit() == leadSuit;
        if (candidateLeadSuit && !winnerLeadSuit) {
            return true;
        }
        if (!candidateLeadSuit) {
            return false;
        }
        return TrumpEvaluator.scorePlain(candidate) > TrumpEvaluator.scorePlain(currentWinner);
    }

    public static int countTrickPoints(List<TrickPlay> trick) {
        return trick.stream().mapToInt(play -> TrumpEvaluator.points(play.card())).sum();
    }
}