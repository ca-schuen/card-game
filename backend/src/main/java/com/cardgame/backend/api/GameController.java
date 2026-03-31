package com.cardgame.backend.api;

import com.cardgame.backend.model.CreateGameRequest;
import com.cardgame.backend.model.GameState;
import com.cardgame.backend.model.PlayRequest;
import com.cardgame.backend.service.GameService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/games")
public class GameController {
    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GameState createGame(@Valid @RequestBody CreateGameRequest request) {
        return gameService.createGame(request);
    }

    @GetMapping("/{sessionId}")
    public GameState getGame(@PathVariable String sessionId) {
        return gameService.getState(sessionId);
    }

    @PostMapping("/{sessionId}/play")
    public GameState play(@PathVariable String sessionId, @Valid @RequestBody PlayRequest request) {
        return gameService.playHumanCard(sessionId, request);
    }

    @PostMapping("/{sessionId}/new-round")
    public GameState newRound(@PathVariable String sessionId) {
        return gameService.newRound(sessionId);
    }
}