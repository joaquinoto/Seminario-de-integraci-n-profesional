package com.panstock.api.repository;

import com.panstock.api.entity.ProductCategory;

import java.util.List;
import java.util.Optional;

public interface ProductCategoryRepository {

    ProductCategory save(ProductCategory category);

    Optional<ProductCategory> findById(Long id);

    List<ProductCategory> findAll();

    List<ProductCategory> findActive();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}