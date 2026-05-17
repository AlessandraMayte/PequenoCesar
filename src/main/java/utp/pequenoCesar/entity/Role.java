package utp.pequenoCesar.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
    CAJERO("Cajero"),
    COCINA("Cocina"),
    GERENTE("Gerente");

    private final String value;

    Role(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public String getAuthority() {
        return "ROLE_" + name();
    }

    @JsonCreator
    public static Role fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        for (Role role : values()) {
            if (role.name().equalsIgnoreCase(value) || role.value.equalsIgnoreCase(value)) {
                return role;
            }
        }

        throw new IllegalArgumentException("Rol invalido: " + value);
    }
}
