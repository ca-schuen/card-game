package com.cardgame.backend.bot;

import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.GameSession;
import com.cardgame.backend.model.GameType;
import com.cardgame.backend.model.Rank;
import com.cardgame.backend.model.Suit;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HeuristicBotStrategyTest {
    private final HeuristicBotStrategy strategy = new HeuristicBotStrategy();

    @Test
    void leadWithManyTrumpsPlaysHighestTrump() {
        GameSession session = sessionForSeatOne(List.of(
            new Card(Suit.E, Rank.O),
            new Card(Suit.G, Rank.O),
            new Card(Suit.H, Rank.U),
            new Card(Suit.S, Rank.U),
            new Card(Suit.E, Rank.SEVEN),
            new Card(Suit.G, Rank.SEVEN),
            new Card(Suit.S, Rank.EIGHT),
            new Card(Suit.S, Rank.NINE)
        ), false);
        Card chosen = strategy.selectCard(session, 1, List.copyOf(session.handForSeat(1)));
        assertEquals(new Card(Suit.E, Rank.O), chosen);
    }

    @Test
    void leadWithoutManyTrumpsPlaysHighestNonTrump() {
        GameSession session = sessionForSeatOne(List.of(
            new Card(Suit.E, Rank.A),
            new Card(Suit.G, Rank.TEN),
            new Card(Suit.S, Rank.K),
            new Card(Suit.G, Rank.SEVEN),
            new Card(Suit.E, Rank.EIGHT),
            new Card(Suit.S, Rank.NINE),
            new Card(Suit.H, Rank.SEVEN),
            new Card(Suit.H, Rank.NINE)
        ), false);
        Card chosen = strategy.selectCard(session, 1, List.copyOf(session.handForSeat(1)));
        assertEquals(new Card(Suit.E, Rank.A), chosen);
    }

    @Test
    void followingUsesLowestWinningTrumpWhenAvailable() {
        GameSession session = sessionForSeatOne(List.of(
            new Card(Suit.H, Rank.K),
            new Card(Suit.H, Rank.NINE),
            new Card(Suit.E, Rank.SEVEN),
            new Card(Suit.G, Rank.SEVEN),
            new Card(Suit.S, Rank.SEVEN),
            new Card(Suit.S, Rank.EIGHT),
            new Card(Suit.G, Rank.EIGHT),
            new Card(Suit.E, Rank.EIGHT)
        ), true);
        Card chosen = strategy.selectCard(session, 1, List.of(
            new Card(Suit.H, Rank.K),
            new Card(Suit.H, Rank.NINE)
        ));
        assertEquals(new Card(Suit.H, Rank.NINE), chosen);
    }

    @Test
    void followingWithoutWinningTrumpPlaysLowestPointCard() {
        GameSession session = sessionForSeatOne(List.of(
            new Card(Suit.E, Rank.K),
            new Card(Suit.E, Rank.SEVEN),
            new Card(Suit.G, Rank.SEVEN),
            new Card(Suit.S, Rank.SEVEN),
            new Card(Suit.G, Rank.EIGHT),
            new Card(Suit.S, Rank.EIGHT),
            new Card(Suit.E, Rank.EIGHT),
            new Card(Suit.G, Rank.NINE)
        ), true);
        Card chosen = strategy.selectCard(session, 1, List.of(
            new Card(Suit.E, Rank.K),
            new Card(Suit.E, Rank.SEVEN)
        ));
        assertEquals(new Card(Suit.E, Rank.SEVEN), chosen);
    }

    private GameSession sessionForSeatOne(List<Card> seatOneCards, boolean botFollowsHumanLead) {
        List<List<Card>> hands = new ArrayList<>();
        hands.add(new ArrayList<>(List.of(
            new Card(Suit.E, Rank.A),
            new Card(Suit.G, Rank.A),
            new Card(Suit.S, Rank.A),
            new Card(Suit.E, Rank.TEN),
            new Card(Suit.G, Rank.TEN),
            new Card(Suit.S, Rank.TEN),
            new Card(Suit.H, Rank.A),
            new Card(Suit.H, Rank.TEN)
        )));
        hands.add(new ArrayList<>(seatOneCards));
        hands.add(new ArrayList<>(List.of(
            new Card(Suit.E, Rank.NINE),
            new Card(Suit.G, Rank.NINE),
            new Card(Suit.H, Rank.NINE),
            new Card(Suit.S, Rank.NINE),
            new Card(Suit.E, Rank.EIGHT),
            new Card(Suit.G, Rank.EIGHT),
            new Card(Suit.H, Rank.EIGHT),
            new Card(Suit.S, Rank.EIGHT)
        )));
        hands.add(new ArrayList<>(List.of(
            new Card(Suit.E, Rank.SEVEN),
            new Card(Suit.G, Rank.SEVEN),
            new Card(Suit.H, Rank.SEVEN),
            new Card(Suit.S, Rank.SEVEN),
            new Card(Suit.E, Rank.U),
            new Card(Suit.G, Rank.U),
            new Card(Suit.H, Rank.U),
            new Card(Suit.S, Rank.U)
        )));
        GameSession session = new GameSession("session", GameType.SAUSPIEL, null, hands);
        if (botFollowsHumanLead) {
            session.playCard(0, session.handForSeat(0).getFirst());
        } else {
            session.settleCurrentTrick(1, 0);
        }
        return session;
    }
}