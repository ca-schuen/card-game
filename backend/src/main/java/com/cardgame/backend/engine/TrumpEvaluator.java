package com.cardgame.backend.engine;

import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.GameType;
import com.cardgame.backend.model.Rank;
import com.cardgame.backend.model.Suit;

import java.util.List;

public final class TrumpEvaluator {
    private static final List<Suit> OBER_ORDER = List.of(Suit.E, Suit.G, Suit.H, Suit.S);
    private static final List<Suit> UNTER_ORDER = List.of(Suit.E, Suit.G, Suit.H, Suit.S);
    private static final List<Rank> PLAIN_ORDER = List.of(
        Rank.A, Rank.TEN, Rank.K, Rank.O, Rank.U, Rank.NINE, Rank.EIGHT, Rank.SEVEN
    );
    private static final List<Rank> TRUMP_SUIT_ORDER = List.of(
        Rank.A, Rank.TEN, Rank.K, Rank.NINE, Rank.EIGHT, Rank.SEVEN
    );

    private TrumpEvaluator() {
    }

    public static boolean isTrump(Card card, GameType gameType, Suit soloSuit) {
        if (card.rank() == Rank.U) {
            return true;
        }
        if (card.rank() == Rank.O) {
            return gameType != GameType.WENZ;
        }
        if (gameType == GameType.WENZ) {
            return false;
        }
        Suit trumpSuit = getTrumpSuit(gameType, soloSuit);
        return card.suit() == trumpSuit;
    }

    public static Suit getTrumpSuit(GameType gameType, Suit soloSuit) {
        return switch (gameType) {
            case SAUSPIEL -> Suit.H;
            case SOLO -> {
                if (soloSuit == null) {
                    throw new IllegalArgumentException("soloSuit is required for solo game");
                }
                yield soloSuit;
            }
            case WENZ -> null;
        };
    }

    public static int scoreTrump(Card card, GameType gameType, Suit soloSuit) {
        if (card.rank() == Rank.O && gameType != GameType.WENZ) {
            return 300 - OBER_ORDER.indexOf(card.suit());
        }
        if (card.rank() == Rank.U) {
            return 200 - UNTER_ORDER.indexOf(card.suit());
        }
        if (gameType == GameType.WENZ) {
            throw new IllegalArgumentException("Only Unters are trumps in Wenz");
        }
        Suit trumpSuit = getTrumpSuit(gameType, soloSuit);
        if (card.suit() != trumpSuit) {
            throw new IllegalArgumentException("Card is not a suit trump");
        }
        return 100 - TRUMP_SUIT_ORDER.indexOf(card.rank());
    }

    public static int scorePlain(Card card) {
        return 100 - PLAIN_ORDER.indexOf(card.rank());
    }

    public static int points(Card card) {
        return switch (card.rank()) {
            case A -> 11;
            case TEN -> 10;
            case K -> 4;
            case O -> 3;
            case U -> 2;
            default -> 0;
        };
    }

    public static String effectiveSuitGroup(Card card, GameType gameType, Suit soloSuit) {
        if (isTrump(card, gameType, soloSuit)) {
            return "TRUMP";
        }
        return card.suit().name();
    }

    public static boolean followsLeadGroup(Card leadCard, Card candidate, GameType gameType, Suit soloSuit) {
        return effectiveSuitGroup(leadCard, gameType, soloSuit)
            .equals(effectiveSuitGroup(candidate, gameType, soloSuit));
    }
}