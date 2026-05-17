package utp.pequenoCesar.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecetaRequest {

    @NotBlank(message = "El nombre de la receta es requerido")
    @Size(max = 120, message = "El nombre no debe exceder 120 caracteres")
    private String nombre;

    @NotNull(message = "El precio personal es requerido")
    @DecimalMin(value = "0.01", message = "El precio personal debe ser mayor a 0")
    private BigDecimal precioPersonal;

    @NotNull(message = "El precio mediana es requerido")
    @DecimalMin(value = "0.01", message = "El precio mediana debe ser mayor a 0")
    private BigDecimal precioMediana;

    @NotNull(message = "El precio familiar es requerido")
    @DecimalMin(value = "0.01", message = "El precio familiar debe ser mayor a 0")
    private BigDecimal precioFamiliar;

    @Valid
    @NotEmpty(message = "Debe agregar al menos un ingrediente")
    private List<IngredienteRequest> ingredientes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IngredienteRequest {

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
}
