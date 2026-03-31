package com.cardgame.backend.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum Rank {
    SEVEN("7"),
    EIGHT("8"),
    NINE("9"),
    U("U"),
    O("O"),
    K("K"),
    TEN("10"),
    A("A");

    private final String value;

    Rank(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static Rank fromValue(String value) {
        if (value == null) {
            return null;
        }
        return Arrays.stream(values())
            .filter(rank -> rank.value.equalsIgnoreCase(value.trim()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unsupported rank: " + value));
    }
}