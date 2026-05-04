module.exports = {
  async up(db) {
    await db.collection('families').createIndex(
      { slug: 1 },
      {
        unique: true,
        name: 'uniq_family_slug'
      }
    );
  },

  async down(db) {
    await db.collection('families').dropIndex('uniq_family_slug');
  }
};
