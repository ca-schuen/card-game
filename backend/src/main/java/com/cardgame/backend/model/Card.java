package com.cardgame.backend.model;

import jakarta.validation.constraints.NotNull;

public record Card(
    @NotNull Suit suit,
    @NotNull Rank rank
) {
}