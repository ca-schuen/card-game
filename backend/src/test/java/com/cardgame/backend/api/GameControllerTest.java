package com.cardgame.backend.api;

import com.cardgame.backend.exception.GlobalExceptionHandler;
import com.cardgame.backend.exception.SessionExpiredException;
import com.cardgame.backend.model.Card;
import com.cardgame.backend.model.CreateGameRequest;
import com.cardgame.backend.model.GameState;
import com.cardgame.backend.model.GameType;
import com.cardgame.backend.model.PlayRequest;
import com.cardgame.backend.model.Rank;
import com.cardgame.backend.model.Suit;
import com.cardgame.backend.service.GameService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GameController.class)
@Import(GlobalExceptionHandler.class)
class GameControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GameService gameService;

    @Test
    void createGameReturnsCreatedAndState() throws Exception {
        GameState state = sampleState();
        when(gameService.createGame(any(CreateGameRequest.class))).thenReturn(state);

        mockMvc.perform(post("/api/games")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateGameRequest(GameType.SAUSPIEL, null))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sessionId").value("session-1"))
            .andExpect(jsonPath("$.humanHand[0].suit").value("E"))
            .andExpect(jsonPath("$.scores.team").value(0));
    }

    @Test
    void getGameReturnsCurrentState() throws Exception {
        when(gameService.getState("abc")).thenReturn(sampleState());

        mockMvc.perform(get("/api/games/abc"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionId").value("session-1"));
    }

    @Test
    void playReturnsUpdatedState() throws Exception {
        when(gameService.playHumanCard(eq("abc"), any(PlayRequest.class))).thenReturn(sampleState());

        mockMvc.perform(post("/api/games/abc/play")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new PlayRequest(0))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.humanTurn").value(true));
    }

    @Test
    void getGameReturnsGoneWhenSessionExpired() throws Exception {
        when(gameService.getState("expired")).thenThrow(new SessionExpiredException("Session expired"));

        mockMvc.perform(get("/api/games/expired"))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.message").value("Session expired"));
    }

    @Test
    void playReturnsBadRequestWhenCardIndexIsNegative() throws Exception {
        mockMvc.perform(post("/api/games/abc/play")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{" +
                    "\"cardIndex\":-1" +
                    "}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Request validation failed"));
    }

    @Test
    void newRoundReturnsUpdatedState() throws Exception {
        when(gameService.newRound("abc")).thenReturn(sampleState());

        mockMvc.perform(post("/api/games/abc/new-round"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sessionId").value("session-1"));
    }

    @Test
    void preflightAllowsLocalhost5500() throws Exception {
        mockMvc.perform(options("/api/games")
                .header("Origin", "http://localhost:5500")
                .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().is2xxSuccessful())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5500"));
    }

    @Test
    void preflightRejectsDisallowedOrigin() throws Exception {
        mockMvc.perform(options("/api/games")
                .header("Origin", "http://localhost:9999")
                .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());
    }

    private GameState sampleState() {
        return new GameState(
            "session-1",
            List.of(new Card(Suit.E, Rank.A)),
            List.of(),
            List.of(),
            Map.of("team", 0, "opponents", 0),
            0,
            false,
            null,
            GameType.SAUSPIEL,
            null,
            0,
            true,
            0
        );
    }
}