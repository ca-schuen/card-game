package com.cardgame.backend.bot;

import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.GameSession;

import java.util.List;

public interface BotStrategy {
    Card selectCard(GameSession session, int botSeat, List<Card> legalCards);
}