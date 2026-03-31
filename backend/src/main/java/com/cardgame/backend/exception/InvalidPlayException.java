package com.cardgame.backend.exception;

public class InvalidPlayException extends RuntimeException {
    public InvalidPlayException(String message) {
        super(message);
    }
}