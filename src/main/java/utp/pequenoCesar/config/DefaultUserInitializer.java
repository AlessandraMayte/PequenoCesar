package utp.pequenoCesar.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import utp.pequenoCesar.entity.Empleado;
import utp.pequenoCesar.entity.Role;
import utp.pequenoCesar.repository.EmpleadoRepository;

@Component
@RequiredArgsConstructor
public class DefaultUserInitializer implements CommandLineRunner {

    private static final Role DEFAULT_ROLE = Role.GERENTE;
    private static final String DEFAULT_STATUS = "Activo";

    private final EmpleadoRepository empleadoRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.default-admin.enabled:false}")
    private boolean defaultAdminEnabled;

    @Value("${app.default-admin.user:admin}")
    private String defaultAdminUser;

    @Value("${app.default-admin.password:}")
    private String defaultAdminPassword;

    @Override
    public void run(String... args) {
        if (!defaultAdminEnabled) {
            return;
        }
        if (isBlank(defaultAdminUser) || isBlank(defaultAdminPassword)) {
            throw new IllegalStateException("DEFAULT_ADMIN_USER y DEFAULT_ADMIN_PASSWORD son requeridos si DEFAULT_ADMIN_ENABLED=true");
        }
        String adminUser = defaultAdminUser.trim();
        String adminPassword = defaultAdminPassword.trim();

        Empleado existingAdmin = empleadoRepository.findByUser(adminUser).orElse(null);
        if (existingAdmin != null) {
            if (!DEFAULT_ROLE.equals(existingAdmin.getRol()) || !DEFAULT_STATUS.equals(existingAdmin.getEstado())) {
                existingAdmin.setRol(DEFAULT_ROLE);
                existingAdmin.setEstado(DEFAULT_STATUS);
                empleadoRepository.save(existingAdmin);
            }
            return;
        }

        Empleado admin = Empleado.builder()
                .nombres("Administrador")
                .apellidos("General")
                .user(adminUser)
                .rol(DEFAULT_ROLE)
                .estado(DEFAULT_STATUS)
                .contrasena(passwordEncoder.encode(adminPassword))
                .build();

        empleadoRepository.save(admin);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
