package com.cardgame.backend.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PlayRequest(
    @NotNull @Min(0) Integer cardIndex
) {
}