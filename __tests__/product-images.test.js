import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Image } from 'react-native';
import { ProductImage } from '../src/components/ui';

test('local product artwork stays visible while an uploaded image loads or fails', async () => {
  let tree;
  await act(async () => {
    tree = Renderer.create(
      <ProductImage
        product={{
          name: 'Fresh Milk',
          imageUrl: 'https://example.invalid/milk.png',
        }}
      />,
    );
  });
  const images = () => tree.root.findAllByType(Image);
  expect(images()).toHaveLength(2);
  const local = images()[0].props.source;
  await act(async () => images()[1].props.onError());
  expect(images()).toHaveLength(1);
  expect(images()[0].props.source).toBe(local);
  await act(async () =>
    tree.update(
      <ProductImage
        product={{
          name: 'Custom produce',
          category: 'Vegetables',
          imageUrl: '',
        }}
      />,
    ),
  );
  expect(images()).toHaveLength(1);
  expect(images()[0].props.source).toBeTruthy();
  await act(async () => tree.unmount());
});
