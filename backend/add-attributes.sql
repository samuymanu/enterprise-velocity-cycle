-- Agregar atributos al producto Bujía
INSERT INTO "AttributeValue" ("id", "productId", "attributeId", "value", "createdAt", "updatedAt")
VALUES 
  ('av_punta_diamante_' || substr(md5(random()::text), 1, 10), 'cme1tdls60008ug9y2ped98qr', 'cme1t6s3d0000ug9y5zvcmt8t', 'true', NOW(), NOW()),
  ('av_material_bujia_' || substr(md5(random()::text), 1, 10), 'cme1tdls60008ug9y2ped98qr', 'cme1t9am10003ug9yy00mj3sc', 'metal', NOW(), NOW());
