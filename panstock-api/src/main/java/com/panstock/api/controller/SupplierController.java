package com.panstock.api.controller;

import com.panstock.api.dto.request.SupplierRequest;
import com.panstock.api.dto.response.SupplierResponse;
import com.panstock.api.enums.SupplierType;
import com.panstock.api.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierResponse create(@Valid @RequestBody SupplierRequest request) {
        return supplierService.create(request);
    }

    @GetMapping
    public List<SupplierResponse> findAll(
            @RequestParam(required = false) Boolean activeOnly,
            @RequestParam(required = false) SupplierType supplierType
    ) {
        return supplierService.findAll(activeOnly, supplierType);
    }

    @GetMapping("/{id}")
    public SupplierResponse findById(@PathVariable Long id) {
        return supplierService.findById(id);
    }

    @PutMapping("/{id}")
    public SupplierResponse update(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequest request
    ) {
        return supplierService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        supplierService.delete(id);
    }
}