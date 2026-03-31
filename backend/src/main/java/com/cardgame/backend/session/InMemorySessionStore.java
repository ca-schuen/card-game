package com.cardgame.backend.session;

import com.cardgame.backend.exception.SessionExpiredException;
import com.cardgame.backend.exception.SessionNotFoundException;
import com.cardgame.backend.model.GameSession;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemorySessionStore {
    private static final Duration TTL = Duration.ofMinutes(30);

    private final Map<String, SessionEntry> sessions = new ConcurrentHashMap<>();

    public void save(GameSession session) {
        sessions.put(session.sessionId(), new SessionEntry(session, Instant.now()));
    }

    public GameSession get(String sessionId) {
        SessionEntry entry = sessions.get(sessionId);
        if (entry == null) {
            throw new SessionNotFoundException("Session not found");
        }
        Instant now = Instant.now();
        if (entry.lastAccessed().plus(TTL).isBefore(now)) {
            sessions.remove(sessionId);
            throw new SessionExpiredException("Session expired");
        }
        entry.setLastAccessed(now);
        return entry.session();
    }

    private static final class SessionEntry {
        private final GameSession session;
        private Instant lastAccessed;

        private SessionEntry(GameSession session, Instant lastAccessed) {
            this.session = session;
            this.lastAccessed = lastAccessed;
        }

        private GameSession session() {
            return session;
        }

        private Instant lastAccessed() {
            return lastAccessed;
        }

        private void setLastAccessed(Instant lastAccessed) {
            this.lastAccessed = lastAccessed;
        }
    }
}