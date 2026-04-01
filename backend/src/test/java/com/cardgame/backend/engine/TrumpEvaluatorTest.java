package com.cardgame.backend.engine;

import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.GameType;
import com.cardgame.backend.model.Rank;
import com.cardgame.backend.model.Suit;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrumpEvaluatorTest {
    @Test
    void sauspielHasObersUntersAndHeartsAsTrump() {
        assertTrue(TrumpEvaluator.isTrump(new Card(Suit.E, Rank.O), GameType.SAUSPIEL, null));
        assertTrue(TrumpEvaluator.isTrump(new Card(Suit.S, Rank.U), GameType.SAUSPIEL, null));
        assertTrue(TrumpEvaluator.isTrump(new Card(Suit.H, Rank.A), GameType.SAUSPIEL, null));
        assertFalse(TrumpEvaluator.isTrump(new Card(Suit.G, Rank.A), GameType.SAUSPIEL, null));
    }

    @Test
    void wenzOnlyObersAndUntersAreTrump() {
        assertTrue(TrumpEvaluator.isTrump(new Card(Suit.E, Rank.U), GameType.WENZ, null));
        assertFalse(TrumpEvaluator.isTrump(new Card(Suit.G, Rank.O), GameType.WENZ, null));
        assertFalse(TrumpEvaluator.isTrump(new Card(Suit.H, Rank.A), GameType.WENZ, null));
        assertFalse(TrumpEvaluator.isTrump(new Card(Suit.S, Rank.TEN), GameType.WENZ, null));
    }

    @Test
    void soloUsesConfiguredSuitAsTrump() {
        assertTrue(TrumpEvaluator.isTrump(new Card(Suit.E, Rank.O), GameType.SOLO, Suit.S));
        assertTrue(TrumpEvaluator.isTrump(new Card(Suit.H, Rank.U), GameType.SOLO, Suit.S));
        assertTrue(TrumpEvaluator.isTrump(new Card(Suit.S, Rank.TEN), GameType.SOLO, Suit.S));
        assertFalse(TrumpEvaluator.isTrump(new Card(Suit.H, Rank.TEN), GameType.SOLO, Suit.S));
    }

    @Test
    void trumpOrderingMatchesRules() {
        int eo = TrumpEvaluator.scoreTrump(new Card(Suit.E, Rank.O), GameType.SAUSPIEL, null);
        int go = TrumpEvaluator.scoreTrump(new Card(Suit.G, Rank.O), GameType.SAUSPIEL, null);
        int eu = TrumpEvaluator.scoreTrump(new Card(Suit.E, Rank.U), GameType.SAUSPIEL, null);
        int heartAce = TrumpEvaluator.scoreTrump(new Card(Suit.H, Rank.A), GameType.SAUSPIEL, null);
        assertTrue(eo > go);
        assertTrue(go > eu);
        assertTrue(eu > heartAce);
    }

    @Test
    void cardPointsMatchSpecification() {
        assertEquals(11, TrumpEvaluator.points(new Card(Suit.E, Rank.A)));
        assertEquals(10, TrumpEvaluator.points(new Card(Suit.E, Rank.TEN)));
        assertEquals(4, TrumpEvaluator.points(new Card(Suit.E, Rank.K)));
        assertEquals(3, TrumpEvaluator.points(new Card(Suit.E, Rank.O)));
        assertEquals(2, TrumpEvaluator.points(new Card(Suit.E, Rank.U)));
        assertEquals(0, TrumpEvaluator.points(new Card(Suit.E, Rank.NINE)));
    }
}