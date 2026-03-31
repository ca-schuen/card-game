package com.cardgame.backend.model;

import java.util.List;
import java.util.Map;

public record GameState(
    String sessionId,
    List<Card> humanHand,
    List<TrickPlay> currentTrick,
    List<List<TrickPlay>> completedTricks,
    Map<String, Integer> scores,
    int trickCount,
    boolean roundComplete,
    String winner,
    GameType gameType,
    Suit soloSuit,
    int humanSeat,
    boolean humanTurn,
    int leadSeat
) {
}