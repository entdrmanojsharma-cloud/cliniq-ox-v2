with open("/Users/Shared/Mobile app cliniq-OX/backend/database/schema.prisma", "r") as f:
    content = f.read()

# Add relation to HospitalProfile
old_hp_relation = "  advanceBalances AdvanceBalance[]"
new_hp_relation = "  advanceBalances AdvanceBalance[]\n  notifications   Notification[]"
content = content.replace(old_hp_relation, new_hp_relation)

# Add relation to User
old_user_relation = "  approvedAccessRequests      DiscountCodeAccessRequest[] @relation(\"ApprovedByUser\")"
new_user_relation = "  approvedAccessRequests      DiscountCodeAccessRequest[] @relation(\"ApprovedByUser\")\n  notifications               Notification[]"
content = content.replace(old_user_relation, new_user_relation)

# Add Notification model at the end
notification_model = """

model Notification {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  hospitalId String   @map("hospital_id") @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  title      String   @db.VarChar(100)
  message    String   @db.Text
  type       String   @db.VarChar(50) // e.g., "ESTIMATE_PENDING", "EVENT_CONFLICT"
  linkId     String?  @map("link_id") @db.Uuid // Target entity ID
  isRead     Boolean  @default(false) @map("is_read")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  hospital   HospitalProfile @relation(fields: [hospitalId], references: [id], onDelete: Cascade)
  user       User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}
"""
content += notification_model

with open("/Users/Shared/Mobile app cliniq-OX/backend/database/schema.prisma", "w") as f:
    f.write(content)
