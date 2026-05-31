package com.panstock.api.service.impl;

import com.panstock.api.dto.request.SupplierRequest;
import com.panstock.api.dto.response.SupplierResponse;
import com.panstock.api.entity.Supplier;
import com.panstock.api.enums.SupplierType;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.SupplierMapper;
import com.panstock.api.repository.SupplierRepository;
import com.panstock.api.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;

    @Override
    public SupplierResponse create(SupplierRequest request) {
        validateSupplierNameForCreate(request.name());

        Supplier supplier = new Supplier();
        applyRequest(supplier, request);

        Supplier saved = supplierRepository.save(supplier);
        return SupplierMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplierResponse> findAll(Boolean activeOnly, SupplierType supplierType) {
        List<Supplier> suppliers;

        if (supplierType != null) {
            suppliers = supplierRepository.findActiveBySupplierType(supplierType);
        } else if (Boolean.TRUE.equals(activeOnly)) {
            suppliers = supplierRepository.findActive();
        } else {
            suppliers = supplierRepository.findAll();
        }

        return suppliers.stream()
                .map(SupplierMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierResponse findById(Long id) {
        Supplier supplier = findSupplier(id);
        return SupplierMapper.toResponse(supplier);
    }

    @Override
    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = findSupplier(id);

        validateSupplierNameForUpdate(request.name(), id);

        applyRequest(supplier, request);

        Supplier saved = supplierRepository.save(supplier);
        return SupplierMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {
        Supplier supplier = findSupplier(id);

        supplier.setActive(false);

        supplierRepository.save(supplier);
    }

    private void applyRequest(Supplier supplier, SupplierRequest request) {
        supplier.setName(request.name());
        supplier.setSupplierType(request.supplierType());
        supplier.setContactName(request.contactName());
        supplier.setPhone(request.phone());
        supplier.setEmail(request.email());
        supplier.setNotes(request.notes());
        supplier.setActive(request.active() != null ? request.active() : true);
    }

    private Supplier findSupplier(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id " + id));
    }

    private void validateSupplierNameForCreate(String name) {
        if (supplierRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Ya existe un proveedor con el nombre " + name);
        }
    }

    private void validateSupplierNameForUpdate(String name, Long id) {
        if (supplierRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BadRequestException("Ya existe otro proveedor con el nombre " + name);
        }
    }
}