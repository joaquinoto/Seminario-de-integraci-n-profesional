package com.panstock.api.service;

import com.panstock.api.dto.request.CategoryRequest;
import com.panstock.api.dto.response.CategoryResponse;

import java.util.List;

public interface CategoryService {

    CategoryResponse create(CategoryRequest request);

    List<CategoryResponse> findAll(Boolean activeOnly);

    CategoryResponse findById(Long id);

    CategoryResponse update(Long id, CategoryRequest request);

    void delete(Long id);
}