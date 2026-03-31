package com.cardgame.backend.engine;

import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.GameType;
import com.cardgame.backend.model.Rank;
import com.cardgame.backend.model.Suit;
import com.cardgame.backend.model.TrickPlay;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrickResolverTest {
    @Test
    void trumpWinsOverLeadSuit() {
        List<TrickPlay> trick = List.of(
            new TrickPlay(0, new Card(Suit.G, Rank.A)),
            new TrickPlay(1, new Card(Suit.G, Rank.TEN)),
            new TrickPlay(2, new Card(Suit.H, Rank.SEVEN)),
            new TrickPlay(3, new Card(Suit.G, Rank.K))
        );
        int winner = TrickResolver.determineTrickWinner(trick, GameType.SAUSPIEL, null);
        assertEquals(2, winner);
    }

    @Test
    void withoutTrumpHighestLeadSuitWins() {
        List<TrickPlay> trick = List.of(
            new TrickPlay(0, new Card(Suit.E, Rank.K)),
            new TrickPlay(1, new Card(Suit.E, Rank.A)),
            new TrickPlay(2, new Card(Suit.G, Rank.A)),
            new TrickPlay(3, new Card(Suit.E, Rank.TEN))
        );
        int winner = TrickResolver.determineTrickWinner(trick, GameType.WENZ, null);
        assertEquals(1, winner);
    }

    @Test
    void trickPointsAreSummedCorrectly() {
        List<TrickPlay> trick = List.of(
            new TrickPlay(0, new Card(Suit.E, Rank.A)),
            new TrickPlay(1, new Card(Suit.E, Rank.TEN)),
            new TrickPlay(2, new Card(Suit.E, Rank.K)),
            new TrickPlay(3, new Card(Suit.E, Rank.SEVEN))
        );
        assertEquals(25, TrickResolver.countTrickPoints(trick));
    }

    @Test
    void soloUsesChosenSuitAsAdditionalTrump() {
        List<TrickPlay> trick = List.of(
            new TrickPlay(0, new Card(Suit.G, Rank.A)),
            new TrickPlay(1, new Card(Suit.G, Rank.TEN)),
            new TrickPlay(2, new Card(Suit.S, Rank.SEVEN)),
            new TrickPlay(3, new Card(Suit.G, Rank.K))
        );
        int winner = TrickResolver.determineTrickWinner(trick, GameType.SOLO, Suit.S);
        assertEquals(2, winner);
    }

    @Test
    void inWenzOberDoesNotBeatLeadSuitWhenNotLead() {
        List<TrickPlay> trick = List.of(
            new TrickPlay(0, new Card(Suit.G, Rank.A)),
            new TrickPlay(1, new Card(Suit.E, Rank.O)),
            new TrickPlay(2, new Card(Suit.G, Rank.K)),
            new TrickPlay(3, new Card(Suit.S, Rank.SEVEN))
        );
        int winner = TrickResolver.determineTrickWinner(trick, GameType.WENZ, null);
        assertEquals(0, winner);
    }
}