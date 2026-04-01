package com.cardgame.backend.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public class GameSession {
    public static final int HUMAN_SEAT = 0;
    public static final int PLAYER_COUNT = 4;
    public static final int TRICKS_PER_ROUND = 8;

    private final String sessionId;
    private final GameType gameType;
    private final Suit soloSuit;
    private final List<List<Card>> hands;
    private final List<List<TrickPlay>> completedTricks = new ArrayList<>();
    private final List<TrickPlay> currentTrick = new ArrayList<>();
    private int teamScore;
    private int opponentsScore;
    private int leadSeat;
    private int currentSeat;
    private int trickCount;
    private boolean roundComplete;
    private String winner;
    private final int partnerSeat;

    public GameSession(String sessionId, GameType gameType, Suit soloSuit, List<List<Card>> hands) {
        this.sessionId = Objects.requireNonNull(sessionId, "sessionId must not be null");
        this.gameType = Objects.requireNonNull(gameType, "gameType must not be null");
        this.soloSuit = soloSuit;
        if (gameType == GameType.SOLO && soloSuit == null) {
            throw new IllegalArgumentException("soloSuit is required for solo game type");
        }
        this.hands = new ArrayList<>();
        for (List<Card> hand : hands) {
            this.hands.add(new ArrayList<>(hand));
        }
        this.leadSeat = HUMAN_SEAT;
        this.currentSeat = HUMAN_SEAT;
        this.partnerSeat = findHerzAceOwner(hands);
    }

    private int findHerzAceOwner(List<List<Card>> allHands) {
        if (gameType != GameType.SAUSPIEL) {
            return -1;
        }
        Card herzAce = new Card(Suit.H, Rank.A);
        for (int i = 0; i < allHands.size(); i++) {
            if (allHands.get(i).contains(herzAce)) {
                return i;
            }
        }
        return -1;
    }

    public String sessionId() {
        return sessionId;
    }

    public GameType gameType() {
        return gameType;
    }

    public Suit soloSuit() {
        return soloSuit;
    }

    public List<Card> handForSeat(int seat) {
        return hands.get(seat);
    }

    public List<Card> humanHandView() {
        return List.copyOf(hands.get(HUMAN_SEAT));
    }

    public List<TrickPlay> currentTrickView() {
        return List.copyOf(currentTrick);
    }

    public List<List<TrickPlay>> completedTricksView() {
        return Collections.unmodifiableList(completedTricks);
    }

    public int teamScore() {
        return teamScore;
    }

    public int opponentsScore() {
        return opponentsScore;
    }

    public int leadSeat() {
        return leadSeat;
    }

    public int currentSeat() {
        return currentSeat;
    }

    public int trickCount() {
        return trickCount;
    }

    public boolean roundComplete() {
        return roundComplete;
    }

    public String winner() {
        return winner;
    }

    public int partnerSeat() {
        return partnerSeat;
    }

    public void playCard(int seat, Card card) {
        if (!hands.get(seat).remove(card)) {
            throw new IllegalArgumentException("Card not in hand for seat " + seat);
        }
        currentTrick.add(new TrickPlay(seat, card));
        currentSeat = (seat + 1) % PLAYER_COUNT;
    }

    public void settleCurrentTrick(int winnerSeat, int points) {
        completedTricks.add(List.copyOf(currentTrick));
        currentTrick.clear();
        trickCount++;
        leadSeat = winnerSeat;
        currentSeat = winnerSeat;
        if (isHumanTeamSeat(winnerSeat)) {
            teamScore += points;
        } else {
            opponentsScore += points;
        }
        if (trickCount >= TRICKS_PER_ROUND) {
            roundComplete = true;
            if (teamScore > opponentsScore) {
                winner = "team";
            } else if (opponentsScore > teamScore) {
                winner = "opponents";
            } else {
                winner = "draw";
            }
        }
    }

    public boolean isHumanTeamSeat(int seat) {
        if (gameType == GameType.SAUSPIEL) {
            return seat == HUMAN_SEAT || seat == partnerSeat;
        }
        return seat == HUMAN_SEAT;
    }

    public boolean humanTurn() {
        return !roundComplete && currentSeat == HUMAN_SEAT;
    }

    public void resetForNewRound(List<List<Card>> newHands) {
        completedTricks.clear();
        currentTrick.clear();
        for (int i = 0; i < hands.size(); i++) {
            hands.get(i).clear();
            hands.get(i).addAll(newHands.get(i));
        }
        teamScore = 0;
        opponentsScore = 0;
        leadSeat = HUMAN_SEAT;
        currentSeat = HUMAN_SEAT;
        trickCount = 0;
        roundComplete = false;
        winner = null;
    }
}