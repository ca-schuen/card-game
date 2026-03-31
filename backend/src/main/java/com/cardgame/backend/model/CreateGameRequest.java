package com.cardgame.backend.model;

import jakarta.validation.constraints.NotNull;

public record CreateGameRequest(
    @NotNull GameType gameType,
    Suit soloSuit
) {
}