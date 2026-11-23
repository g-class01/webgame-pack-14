var DsBoot = pc.createScript('dsBoot');

// Don't Splash sahnesi LoadManager'da lobi sayıldığı için eşya veritabanı atanmıyor.
// Oyuncunun envanteri kayıtlı eşyaları yüklemeden önce (Managers, Player'dan önce başlar) burada atanır.
DsBoot.prototype.initialize = function () {
    if (!this.app.itemDatabase && this.entity.script && this.entity.script.itemDatabase) this.app.itemDatabase = this.entity.script.itemDatabase;
};
