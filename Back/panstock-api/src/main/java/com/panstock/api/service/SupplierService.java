package com.panstock.api.service;

import com.panstock.api.dto.request.SupplierRequest;
import com.panstock.api.dto.response.SupplierResponse;
import com.panstock.api.enums.SupplierType;

import java.util.List;

public interface SupplierService {

    SupplierResponse create(SupplierRequest request);

    List<SupplierResponse> findAll(Boolean activeOnly, SupplierType supplierType);

    SupplierResponse findById(Long id);

    SupplierResponse update(Long id, SupplierRequest request);

    void delete(Long id);
}