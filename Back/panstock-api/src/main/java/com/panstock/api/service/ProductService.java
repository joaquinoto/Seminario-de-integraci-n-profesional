package com.panstock.api.service;

import com.panstock.api.dto.request.ProductRequest;
import com.panstock.api.dto.response.ProductResponse;
import com.panstock.api.enums.ProductOrigin;

import java.util.List;

public interface ProductService {

    ProductResponse create(ProductRequest request);

    List<ProductResponse> findAll(ProductOrigin origin, Long categoryId, Boolean activeOnly);

    ProductResponse findById(Long id);

    ProductResponse update(Long id, ProductRequest request);

    void delete(Long id);
}