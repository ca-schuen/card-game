package com.cardgame.backend.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Suit {
    E,
    G,
    H,
    S;

    @JsonCreator
    public static Suit fromValue(String value) {
        if (value == null) {
            return null;
        }
        return Suit.valueOf(value.trim().toUpperCase());
    }

    @JsonValue
    public String toJson() {
        return name();
    }
}