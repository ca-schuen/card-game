package com.cardgame.backend.service;

import com.cardgame.backend.bot.HeuristicBotStrategy;
import com.cardgame.backend.engine.DeckFactory;
import com.cardgame.backend.engine.GameEngine;
import com.cardgame.backend.exception.InvalidPlayException;
import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.CreateGameRequest;
import com.cardgame.backend.model.GameSession;
import com.cardgame.backend.model.GameState;
import com.cardgame.backend.model.GameType;
import com.cardgame.backend.model.PlayRequest;
import com.cardgame.backend.model.Rank;
import com.cardgame.backend.model.Suit;
import com.cardgame.backend.session.InMemorySessionStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GameServiceTest {
    private GameService gameService;
    private GameEngine gameEngine;
    private InMemorySessionStore sessionStore;

    @BeforeEach
    void setUp() {
        gameEngine = new GameEngine();
        sessionStore = new InMemorySessionStore();
        gameService = new GameService(
            new DeckFactory(new Random(1)),
            gameEngine,
            new HeuristicBotStrategy(),
            sessionStore
        );
    }

    @Test
    void createGameReturnsStateWithoutBotHands() {
        GameState state = gameService.createGame(new CreateGameRequest(GameType.SAUSPIEL, null));
        assertNotNull(state.sessionId());
        assertEquals(8, state.humanHand().size());
        assertFalse(state.roundComplete());
        assertEquals(0, state.currentTrick().size());
    }

    @Test
    void createSoloWithoutSuitFails() {
        assertThrows(InvalidPlayException.class,
            () -> gameService.createGame(new CreateGameRequest(GameType.SOLO, null)));
    }

    @Test
    void playWithOutOfRangeIndexFailsValidation() {
        GameState created = gameService.createGame(new CreateGameRequest(GameType.SOLO, Suit.E));
        assertThrows(InvalidPlayException.class,
            () -> gameService.playHumanCard(created.sessionId(), new PlayRequest(99)));
    }

    @Test
    void humanPlayAdvancesStateAndKeepsHumanHandHiddenOnly() {
        GameState created = gameService.createGame(new CreateGameRequest(GameType.WENZ, null));
        int before = created.humanHand().size();
        GameState updated = gameService.playHumanCard(created.sessionId(), new PlayRequest(0));
        assertEquals(before - 1, updated.humanHand().size());
        assertNotNull(updated.scores());
    }

    @Test
    void legalCardsEnforcesFollowSuitGroupWhenPossible() {
        List<List<Card>> hands = new ArrayList<>();
        hands.add(new ArrayList<>(List.of(new Card(Suit.E, Rank.A))));
        hands.add(new ArrayList<>(List.of(new Card(Suit.E, Rank.K), new Card(Suit.G, Rank.A))));
        hands.add(new ArrayList<>(List.of(new Card(Suit.S, Rank.SEVEN))));
        hands.add(new ArrayList<>(List.of(new Card(Suit.H, Rank.SEVEN))));

        GameSession session = new GameSession("s-follow", GameType.SAUSPIEL, null, hands);
        session.playCard(0, new Card(Suit.E, Rank.A));

        List<Card> legal = gameEngine.legalCards(session, 1);
        assertEquals(List.of(new Card(Suit.E, Rank.K)), legal);
    }

    @Test
    void roundCompletesAfterEightTricksThroughServiceFlow() {
        GameState state = gameService.createGame(new CreateGameRequest(GameType.WENZ, null));
        String sessionId = state.sessionId();

        while (!state.roundComplete()) {
            GameSession live = sessionStore.get(sessionId);
            List<Card> legal = gameEngine.legalCards(live, GameSession.HUMAN_SEAT);
            Card chosen = legal.getFirst();
            int cardIndex = live.handForSeat(GameSession.HUMAN_SEAT).indexOf(chosen);
            state = gameService.playHumanCard(sessionId, new PlayRequest(cardIndex));
        }

        assertTrue(state.roundComplete());
        assertEquals(8, state.trickCount());
        assertNotNull(state.winner());
        assertEquals(8, state.completedTricks().size());
        assertThrows(InvalidPlayException.class,
            () -> gameService.playHumanCard(sessionId, new PlayRequest(0)));
    }

    @Test
    void newRoundResetsStateAndDealsDifferentHumanHand() {
        GameState created = gameService.createGame(new CreateGameRequest(GameType.SAUSPIEL, null));
        List<Card> before = List.copyOf(created.humanHand());

        GameState refreshed = gameService.newRound(created.sessionId());

        assertEquals(created.sessionId(), refreshed.sessionId());
        assertEquals(8, refreshed.humanHand().size());
        assertEquals(0, refreshed.trickCount());
        assertFalse(refreshed.roundComplete());
        assertEquals(0, refreshed.currentTrick().size());
        assertFalse(before.equals(refreshed.humanHand()));
    }
}