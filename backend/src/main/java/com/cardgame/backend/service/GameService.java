package com.cardgame.backend.service;

import com.cardgame.backend.bot.BotStrategy;
import com.cardgame.backend.engine.DeckFactory;
import com.cardgame.backend.engine.GameEngine;
import com.cardgame.backend.exception.InvalidPlayException;
import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.CreateGameRequest;
import com.cardgame.backend.model.GameSession;
import com.cardgame.backend.model.GameState;
import com.cardgame.backend.model.PlayRequest;
import com.cardgame.backend.session.InMemorySessionStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GameService {
    private final DeckFactory deckFactory;
    private final GameEngine gameEngine;
    private final BotStrategy botStrategy;
    private final InMemorySessionStore sessionStore;

    public GameService(DeckFactory deckFactory, GameEngine gameEngine, BotStrategy botStrategy, InMemorySessionStore sessionStore) {
        this.deckFactory = deckFactory;
        this.gameEngine = gameEngine;
        this.botStrategy = botStrategy;
        this.sessionStore = sessionStore;
    }

    public GameState createGame(CreateGameRequest request) {
        validateCreateRequest(request);
        String sessionId = UUID.randomUUID().toString();
        List<Card> deck = deckFactory.createShuffledDeck();
        List<List<Card>> hands = deckFactory.deal(deck, GameSession.PLAYER_COUNT, GameSession.TRICKS_PER_ROUND);
        GameSession session = new GameSession(sessionId, request.gameType(), request.soloSuit(), hands);
        sessionStore.save(session);
        return toState(session);
    }

    public GameState getState(String sessionId) {
        return toState(sessionStore.get(sessionId));
    }

    public GameState playHumanCard(String sessionId, PlayRequest request) {
        GameSession session = sessionStore.get(sessionId);
        if (!session.humanTurn()) {
            throw new InvalidPlayException("It is not human turn");
        }
        gameEngine.playByCardIndex(session, GameSession.HUMAN_SEAT, request.cardIndex());
        driveBotsUntilHumanTurnOrRoundEnd(session);
        return toState(session);
    }

    public GameState newRound(String sessionId) {
        GameSession session = sessionStore.get(sessionId);
        List<Card> deck = deckFactory.createShuffledDeck();
        List<List<Card>> hands = deckFactory.deal(deck, GameSession.PLAYER_COUNT, GameSession.TRICKS_PER_ROUND);
        session.resetForNewRound(hands);
        return toState(session);
    }

    private void driveBotsUntilHumanTurnOrRoundEnd(GameSession session) {
        while (!session.roundComplete() && !session.humanTurn()) {
            int seat = session.currentSeat();
            List<Card> legal = gameEngine.legalCards(session, seat);
            Card chosen = botStrategy.selectCard(session, seat, legal);
            gameEngine.playCard(session, seat, chosen);
        }
    }

    private GameState toState(GameSession session) {
        List<Card> humanHand = session.humanHandView();
        List<Card> legal = gameEngine.legalCards(session, GameSession.HUMAN_SEAT);
        List<Integer> legalIndices = computeLegalCardIndices(humanHand, legal);

        return new GameState(
            session.sessionId(),
            humanHand,
            session.currentTrickView(),
            session.completedTricksView(),
            Map.of("team", session.teamScore(), "opponents", session.opponentsScore()),
            session.trickCount(),
            session.roundComplete(),
            session.winner(),
            session.gameType(),
            session.soloSuit(),
            GameSession.HUMAN_SEAT,
            session.humanTurn(),
            session.leadSeat(),
            legalIndices
        );
    }

    private List<Integer> computeLegalCardIndices(List<Card> humanHand, List<Card> legalCards) {
        List<Integer> indices = new ArrayList<>();
        for (Card legalCard : legalCards) {
            for (int i = 0; i < humanHand.size(); i++) {
                if (humanHand.get(i).equals(legalCard)) {
                    indices.add(i);
                    break;
                }
            }
        }
        return indices;
    }

    private void validateCreateRequest(CreateGameRequest request) {
        if (request.gameType() == null) {
            throw new InvalidPlayException("gameType is required");
        }
        if (request.gameType().name().equals("SOLO") && request.soloSuit() == null) {
            throw new InvalidPlayException("soloSuit is required for solo game type");
        }
        if (!request.gameType().name().equals("SOLO") && request.soloSuit() != null) {
            throw new InvalidPlayException("soloSuit is only allowed for solo game type");
        }
    }
}