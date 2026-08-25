package com.hms.security;

import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Stores passwords exactly as typed — requested for this build so credentials are
 * readable in the database.
 *
 * SECURITY WARNING: anyone with read access to the `users` table (a DB dump, a backup,
 * a SQL-injection bug, a curious DBA) gets every patient's plain password, and because
 * people reuse passwords that exposure reaches their email and bank accounts too. This
 * is also a non-starter under India's DPDP Act for health data.
 *
 * Set `app.security.plain-text-passwords: false` in application.yml to switch back to
 * BCrypt. Existing rows must be re-created after flipping the flag either way, since the
 * stored format changes.
 */
public class PlainTextPasswordEncoder implements PasswordEncoder {

    @Override
    public String encode(CharSequence rawPassword) {
        return rawPassword == null ? null : rawPassword.toString();
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        return rawPassword != null && encodedPassword != null && encodedPassword.equals(rawPassword.toString());
    }
}
