package utp.pequenoCesar.config;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import utp.pequenoCesar.entity.Empleado;
import utp.pequenoCesar.repository.EmpleadoRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private static final String ACTIVE_STATUS = "Activo";

    private final EmpleadoRepository empleadoRepository;

    @Override
    public UserDetails loadUserByUsername(String user) throws UsernameNotFoundException {
        Empleado empleado = empleadoRepository.findByUser(user)
                .orElseThrow(() -> new UsernameNotFoundException("Empleado no encontrado: " + user));

        if (!ACTIVE_STATUS.equalsIgnoreCase(empleado.getEstado())) {
            throw new DisabledException("Empleado inactivo. No puede iniciar sesion.");
        }

        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority(empleado.getRol().getAuthority())
        );

        return new org.springframework.security.core.userdetails.User(
                empleado.getUser(),
                empleado.getContrasena(),
                authorities
        );
    }
}
