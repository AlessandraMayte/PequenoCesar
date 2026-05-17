package utp.pequenoCesar.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecetaIngredienteRequest {

    @NotNull(message = "El insumo es requerido")
    private UUID idInsumo;

    @NotNull(message = "La cantidad personal es requerida")
    @DecimalMin(value = "0.01", message = "La cantidad personal debe ser mayor a 0")
    private BigDecimal cantidadPersonal;

    @NotNull(message = "La cantidad mediana es requerida")
    @DecimalMin(value = "0.01", message = "La cantidad mediana debe ser mayor a 0")
    private BigDecimal cantidadMediana;

    @NotNull(message = "La cantidad familiar es requerida")
    @DecimalMin(value = "0.01", message = "La cantidad familiar debe ser mayor a 0")
    private BigDecimal cantidadFamiliar;
}
