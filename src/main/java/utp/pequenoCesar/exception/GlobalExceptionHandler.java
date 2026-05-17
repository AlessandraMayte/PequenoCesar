package utp.pequenoCesar.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import utp.pequenoCesar.dto.response.ApiResponseDto;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponseDto<String>> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {

        ApiResponseDto<String> response = ApiResponseDto.<String>builder()
                .success(false)
                .message(ex.getMessage())
                .build();

        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponseDto<String>> handleBadRequestException(
            BadRequestException ex, WebRequest request) {

        ApiResponseDto<String> response = ApiResponseDto.<String>builder()
                .success(false)
                .message(ex.getMessage())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponseDto<String>> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {

        ApiResponseDto<String> response = ApiResponseDto.<String>builder()
                .success(false)
                .message("Acceso denegado: No tiene permisos para esta acción")
                .build();

        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponseDto<String>> handleAuthenticationException(
            AuthenticationException ex, WebRequest request) {

        String message = ex instanceof DisabledException
                ? ex.getMessage()
                : "Usuario o contrasena incorrectos";

        ApiResponseDto<String> response = ApiResponseDto.<String>builder()
                .success(false)
                .message(message)
                .build();

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponseDto<String>> handleValidationExceptions(
            MethodArgumentNotValidException ex, WebRequest request) {

        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        ApiResponseDto<String> response = ApiResponseDto.<String>builder()
                .success(false)
                .message(message)
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponseDto<String>> handleIllegalArgumentException(
            IllegalArgumentException ex, WebRequest request) {

        ApiResponseDto<String> response = ApiResponseDto.<String>builder()
                .success(false)
                .message(ex.getMessage())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponseDto<String>> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException ex, WebRequest request) {

        ApiResponseDto<String> response = ApiResponseDto.<String>builder()
                .success(false)
                .message("Solicitud invalida. Verifique los valores enviados")
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponseDto<String>> handleGlobalException(
            Exception ex, WebRequest request) {

        ApiResponseDto<String> response = ApiResponseDto.<String>builder()
                .success(false)
                .message("Error interno del servidor")
                .build();

        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
