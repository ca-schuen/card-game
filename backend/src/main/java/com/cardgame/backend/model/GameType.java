package com.cardgame.backend.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum GameType {
    SAUSPIEL("sauspiel"),
    WENZ("wenz"),
    SOLO("solo");

    private final String value;

    GameType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static GameType fromValue(String value) {
        if (value == null) {
            return null;
        }
        return Arrays.stream(values())
            .filter(type -> type.value.equalsIgnoreCase(value.trim()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unsupported gameType: " + value));
    }
}