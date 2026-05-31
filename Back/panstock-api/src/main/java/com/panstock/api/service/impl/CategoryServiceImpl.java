package com.panstock.api.service.impl;

import com.panstock.api.dto.request.CategoryRequest;
import com.panstock.api.dto.response.CategoryResponse;
import com.panstock.api.entity.ProductCategory;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.exception.ResourceNotFoundException;
import com.panstock.api.mapper.CategoryMapper;
import com.panstock.api.repository.ProductCategoryRepository;
import com.panstock.api.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final ProductCategoryRepository productCategoryRepository;

    @Override
    public CategoryResponse create(CategoryRequest request) {
        validateCategoryNameForCreate(request.name());

        ProductCategory category = new ProductCategory();
        applyRequest(category, request);

        ProductCategory saved = productCategoryRepository.save(category);
        return CategoryMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> findAll(Boolean activeOnly) {
        List<ProductCategory> categories = Boolean.TRUE.equals(activeOnly)
                ? productCategoryRepository.findActive()
                : productCategoryRepository.findAll();

        return categories.stream()
                .map(CategoryMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse findById(Long id) {
        ProductCategory category = findCategory(id);
        return CategoryMapper.toResponse(category);
    }

    @Override
    public CategoryResponse update(Long id, CategoryRequest request) {
        ProductCategory category = findCategory(id);

        validateCategoryNameForUpdate(request.name(), id);

        applyRequest(category, request);

        ProductCategory saved = productCategoryRepository.save(category);
        return CategoryMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {
        ProductCategory category = findCategory(id);

        category.setActive(false);

        productCategoryRepository.save(category);
    }

    private void applyRequest(ProductCategory category, CategoryRequest request) {
        category.setName(request.name());
        category.setDescription(request.description());
        category.setActive(request.active() != null ? request.active() : true);
    }

    private ProductCategory findCategory(Long id) {
        return productCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoría no encontrada con id " + id));
    }

    private void validateCategoryNameForCreate(String name) {
        if (productCategoryRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Ya existe una categoría con el nombre " + name);
        }
    }

    private void validateCategoryNameForUpdate(String name, Long id) {
        if (productCategoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BadRequestException("Ya existe otra categoría con el nombre " + name);
        }
    }
}