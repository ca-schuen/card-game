package com.cardgame.backend.engine;

import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.Rank;
import com.cardgame.backend.model.Suit;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@Component
public class DeckFactory {
    private final Random random;

    public DeckFactory() {
        this(new SecureRandom());
    }

    public DeckFactory(Random random) {
        this.random = random;
    }

    public List<Card> createShuffledDeck() {
        List<Card> deck = new ArrayList<>(32);
        for (Suit suit : Suit.values()) {
            for (Rank rank : Rank.values()) {
                deck.add(new Card(suit, rank));
            }
        }
        Collections.shuffle(deck, random);
        return deck;
    }

    public List<List<Card>> deal(List<Card> deck, int playerCount, int cardsPerPlayer) {
        int expected = playerCount * cardsPerPlayer;
        if (deck.size() != expected) {
            throw new IllegalArgumentException("Deck must contain exactly " + expected + " cards");
        }
        List<List<Card>> hands = new ArrayList<>(playerCount);
        for (int i = 0; i < playerCount; i++) {
            hands.add(new ArrayList<>());
        }
        for (int i = 0; i < deck.size(); i++) {
            hands.get(i % playerCount).add(deck.get(i));
        }
        return hands;
    }
}