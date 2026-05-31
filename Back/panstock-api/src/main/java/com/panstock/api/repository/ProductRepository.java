package com.panstock.api.repository;

import com.panstock.api.entity.Product;
import com.panstock.api.enums.ProductOrigin;

import java.util.List;
import java.util.Optional;

public interface ProductRepository {

    Product save(Product product);

    Optional<Product> findById(Long id);

    List<Product> findAll();

    List<Product> findActive();

    List<Product> findActiveByOrigin(ProductOrigin origin);

    List<Product> findActiveByCategoryId(Long categoryId);
}