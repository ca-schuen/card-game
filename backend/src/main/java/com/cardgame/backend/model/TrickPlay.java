package com.cardgame.backend.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record TrickPlay(
    @Min(0) @Max(3) int seat,
    @NotNull Card card
) {
}