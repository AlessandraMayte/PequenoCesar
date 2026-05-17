package utp.pequenoCesar.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import utp.pequenoCesar.dto.response.ApiResponseDto;
import utp.pequenoCesar.dto.response.ReniecPersonaResponse;
import utp.pequenoCesar.service.ReniecService;

@RestController
@RequestMapping("/api/reniec")
@RequiredArgsConstructor
public class ReniecController {

    private final ReniecService reniecService;

    @GetMapping("/dni")
    public ResponseEntity<ApiResponseDto<ReniecPersonaResponse>> findByDni(@RequestParam String numero) {
        return ResponseEntity.ok(ApiResponseDto.<ReniecPersonaResponse>builder()
                .success(true)
                .data(reniecService.findByDni(numero))
                .build());
    }
}
