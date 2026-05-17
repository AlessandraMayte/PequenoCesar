package utp.pequenoCesar.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventarioRequest {

    @NotBlank(message = "El nombre del insumo es requerido")
    private String nombreInsumo;

    @NotNull(message = "El stock actual es requerido")
    @DecimalMin(value = "0.00", message = "El stock actual no puede ser negativo")
    private BigDecimal stockActual;

    @NotBlank(message = "La unidad es requerida")
    @Size(max = 20, message = "La unidad no debe exceder 20 caracteres")
    private String unidad;

    @NotNull(message = "El stock mínimo es requerido")
    @DecimalMin(value = "0.01", message = "El stock mínimo debe ser mayor a 0")
    private BigDecimal stockMinimo;

    @NotNull(message = "La fecha de caducidad es requerida")
    @Future(message = "La fecha de caducidad debe ser una fecha futura")
    private LocalDate fechaCaducidad;
}
