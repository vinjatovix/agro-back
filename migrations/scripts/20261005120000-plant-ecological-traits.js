// Fills `traits.ecological` (`edible`, `toxic`, `toxicityNotes`) of the catalog
// plants from Plants For A Future (pfaf.org), looked up by scientific name in
// October 2026 (835 of 1846 local plants are listed there):
// - `edible` is `true` when PFAF gives the species an edibility rating of 1 or
//   more, `false` when it rates it 0;
// - `toxic` is `true` when PFAF's "Known Hazards" describe a part of the plant
//   as toxic, poisonous or harmful to eat or touch, and `false` when they say
//   "None known". Vaguer hazards (a toxic genus, large doses only…) were read
//   one by one and the key is left out when the answer is not clear;
// - `toxicityNotes` sums up those hazards in Spanish, in our own words (toxic
//   parts, doses, whether cooking or drying removes them), whenever PFAF lists
//   any besides "None known";
// - a cultivar, variety or form takes the values of its species; a genus
//   (`spp`) or a plant PFAF does not list gets nothing.
// A key left out means "no data", never `false`: the API's `edible`/`toxic`
// filters only match plants that carry the flag.
// Only plants without `traits.ecological` are changed, so a value set through
// the API is never overwritten. Every changed plant gets `version + 1` and its
// update metadata, since its representation changes.
// The data is a frozen snapshot: it lives in this file because start-up only
// ships `migrations/scripts/*.js`.

const MIGRATION_USER = 'system';

const BATCH_SIZE = 500;

/** Lower-case scientific name → what PFAF supports. */
const ECOLOGICAL_TRAITS = {
  'abelmoschus esculentus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos de las vainas pueden irritar la piel: usar guantes al cosechar. Se quitan lavándolas.'
  },
  'abelmoschus manihot': { edible: true, toxic: false },
  'abelmoschus moschatus': { edible: true, toxic: false },
  'abutilon megapotamicum': { edible: true, toxic: false },
  'abutilon pictum': { edible: true, toxic: false },
  'abutilon theophrasti': { edible: true, toxic: false },
  'acacia dealbata': { edible: true, toxic: false },
  'acacia farnesiana': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas maduras contienen un alcaloide tóxico (en Brasil se usan para matar perros rabiosos) y no son comestibles.'
  },
  'acacia longifolia': { edible: true, toxic: false },
  'acca sellowiana': { edible: true, toxic: false },
  'achnatherum hymenoides': { edible: true, toxic: false },
  'achnatherum splendens': { edible: false, toxic: false },
  'acmella oleracea': { edible: true, toxic: false },
  'aconitum napellus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta es muy tóxica y actúa sobre el sistema nervioso (estimula y luego paraliza); causa ardor en la lengua, vómitos y diarrea. Basta tocarla para entumecer la piel. La raíz es la parte más venenosa.'
  },
  'actinidia arguta': { edible: true, toxic: false },
  'actinidia deliciosa': { edible: true, toxic: false },
  'actinidia kolomikta': { edible: true, toxic: false },
  'actinidia polygama': { edible: true, toxic: false },
  'adenanthera pavonina': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Las semillas crudas son venenosas.'
  },
  'aegle marmelos': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas pueden causar aborto y esterilidad; la corteza se usa como veneno para peces. El fruto se come.'
  },
  'agastache foeniculum': { edible: true, toxic: false },
  'agastache rugosa': { edible: true, toxic: false },
  'agave americana': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La savia fresca puede causar dermatitis y cada hoja acaba en una espina muy dura y afilada: ubicarla con cuidado.'
  },
  'agave tequilana': {
    edible: true,
    toxicityNotes:
      'Hojas con espinas fuertes y afiladas. Flores, néctar, tallo floral tierno y centro de la roseta son comestibles con buena preparación, pero algunas especies tienen muchas saponinas y otros compuestos irritantes.'
  },
  'agrostemma githago': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Semillas y hojas son venenosas por sus saponinas. Mala hierba de los cereales: no consumir.'
  },
  'agrostis capillaris': { edible: false, toxic: false },
  'ajuga chamaepitys': { edible: false, toxic: false },
  'ajuga reptans': { edible: true, toxic: false },
  'albizia julibrissin': { edible: true, toxic: false },
  'alcea rosea': { edible: true, toxic: false },
  'alchornea cordifolia': { edible: true, toxic: false },
  'alkanna tinctoria': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Tóxica para el hígado y posiblemente cancerígena: no usarla internamente.'
  },
  'allium ampeloprasum var. porrum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Seguro para personas en cantidades normales. En grandes cantidades es tóxico para algunos mamíferos, sobre todo perros.'
  },
  'allium cepa': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Segura para personas; en grandes cantidades es tóxica para algunos mamíferos, sobre todo perros. Manipularla a menudo puede causar eccema.'
  },
  'allium sativum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Seguro para personas; en grandes cantidades es tóxico para algunos mamíferos, sobre todo perros. Precaución con anticoagulantes y antes de una operación.'
  },
  'allium schoenoprasum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Seguro para personas en cantidades normales. Ingerido en grandes cantidades es tóxico para algunos mamíferos, sobre todo perros.'
  },
  'allium triquetrum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Seguro para personas en cantidades normales. Ingerido en grandes cantidades es tóxico para algunos mamíferos, sobre todo perros.'
  },
  'allium tuberosum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Seguro para personas en cantidades normales. Ingerido en grandes cantidades es tóxico para algunos mamíferos, sobre todo perros.'
  },
  'alocasia macrorrhizos': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta contiene cristales de oxalato cálcico, tóxicos y muy irritantes en fresco. Cocinarla bien o secarla del todo los destruye.'
  },
  'aloe arborescens': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La savia contiene antraquinonas, laxantes: seguras en dosis pequeñas y periodos cortos, pero en exceso irritan los órganos pélvicos y su uso prolongado es perjudicial.'
  },
  'aloe ferox': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La savia contiene antraquinonas, laxantes: seguras en dosis pequeñas y periodos cortos, pero en exceso irritan los órganos pélvicos y su uso prolongado es perjudicial.'
  },
  'aloe vera': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Tomada por vía oral puede causar retortijones y diarrea; el uso prolongado provoca pérdida de potasio y raramente daño renal o alteraciones del ritmo cardiaco. El gel usado mucho tiempo puede irritar la piel.'
  },
  'alstroemeria aurea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El contacto con la savia puede causar dermatitis en personas sensibles.'
  },
  'althaea cannabina': { edible: false, toxic: false },
  'althaea officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin efectos adversos documentados; hay informes aislados de alergia y bajada de azúcar.'
  },
  'amaranthus caudatus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Ninguna especie del género es venenosa, pero en suelos muy nitrogenados o con abonos químicos acumula nitratos en las hojas: mejor cultivarlo en ecológico.'
  },
  'amaranthus cruentus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Ninguna especie del género es venenosa, pero en suelos muy nitrogenados o con abonos químicos acumula nitratos en las hojas: mejor cultivarlo en ecológico.'
  },
  'amaranthus hypochondriacus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Ninguna especie del género es venenosa, pero en suelos muy nitrogenados o con abonos químicos acumula nitratos en las hojas: mejor cultivarlo en ecológico.'
  },
  'amaranthus tricolor': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Ninguna especie del género es venenosa, pero en suelos muy nitrogenados o con abonos químicos acumula nitratos en las hojas: mejor cultivarlo en ecológico.'
  },
  'amelanchier alnifolia': { edible: true, toxic: false },
  'amelanchier lamarckii': { edible: true, toxic: false },
  'ammi majus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La raíz contiene 8-metoxipsoraleno, y el contacto con la savia puede causar fotosensibilidad o dermatitis.'
  },
  'ammi visnaga': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'El contacto con la savia puede causar fotosensibilidad o dermatitis. Evitar en el embarazo, la lactancia y con anticoagulantes. El uso prolongado causa trastornos digestivos, mareos y vómitos.'
  },
  'amomyrtus luma': { edible: true, toxic: false },
  'amorpha fruticosa': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Se dice que contiene alcaloides y es venenosa para el ganado.'
  },
  'amorphophallus konjac': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Muy tóxica cruda: contiene cristales de oxalato cálcico que se clavan como agujas en boca y garganta. Cocinarla bien o secarla del todo los destruye.'
  },
  'amorphophallus paeoniifolius': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Cruda, como su familia, contiene oxalato cálcico, tóxico y muy irritante para boca y garganta. Se destruye cocinándola bien o secándola por completo.'
  },
  'ampelopsis brevipedunculata': { edible: true, toxic: false },
  'anagallis arvensis': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas son ligeramente venenosas para algunos mamíferos (no hay casos en personas) y la planta puede causar dermatitis.'
  },
  'ananas comosus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'El fruto verde y las hojas pueden irritar y causar vómitos; el fruto maduro se come. Su bromelina irrita la boca en cantidad.'
  },
  'anchusa azurea': { edible: true, toxic: false },
  'andropogon gerardii': { edible: false, toxic: false },
  'androsace sarmentosa': { edible: false, toxic: false },
  'anemone nemorosa': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta contiene protoanemonina, muy irritante para piel y aparato digestivo; al secarse o calentarse pasa a anemonina inocua. Puede deprimir el sistema nervioso y el corazón.'
  },
  'anethum graveolens': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene miristicina y puede causar fotosensibilidad o dermatitis. Evitar el aceite de eneldo en el embarazo.'
  },
  'anthriscus cerefolium': { edible: true, toxic: false },
  'anthyllis vulneraria': { edible: true, toxic: false },
  'antidesma bunius': {
    edible: true,
    toxic: true,
    toxicityNotes: 'La corteza contiene un alcaloide tóxico. El fruto se come.'
  },
  'antirrhinum majus': { edible: true, toxic: false },
  'apios americana': { edible: true, toxic: false },
  'apium graveolens': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Si la planta está infectada por el hongo Sclerotinia, la savia puede causar dermatitis. Posibles alergias graves y reacciones cruzadas con pepino, zanahoria, sandía y manzana. Evitar en el embarazo en dosis medicinales.'
  },
  'arachis hypogaea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las semillas dañadas o enmohecidas pueden contener aflatoxinas, cancerígenas, que no se eliminan: desecharlas. Alergia frecuente al cacahuete.'
  },
  'arachis pintoi': { edible: false, toxic: false },
  'arbutus andrachne': { edible: true, toxic: false },
  'arbutus menziesii': { edible: true, toxic: false },
  'arbutus unedo': { edible: true, toxic: false },
  'arctostaphylos manzanita': { edible: true, toxic: false },
  'arctostaphylos uva-ursi': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'En sobredosis causa náuseas, vómitos, zumbido de oídos, ahogo y convulsiones. No usar en el embarazo.'
  },
  'argemone albiflora': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta, incluidas las semillas, contiene alcaloides tóxicos.'
  },
  'argemone mexicana': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta, incluidas las semillas, contiene alcaloides tóxicos.'
  },
  'armoracia rusticana': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En grandes cantidades es venenoso por sus aceites volátiles. Contraindicado con nefritis, hepatitis, reflujo o inflamación intestinal; en cantidades culinarias, sin problema.'
  },
  'arracacia xanthorrhiza': { edible: true, toxic: false },
  'artemisia dracunculus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin registros de toxicidad. El contacto con algunas especies del género da dermatitis o alergias.'
  },
  'arundo donax': { edible: true, toxic: false },
  'asparagus officinalis': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las bayas son ligeramente venenosas. Los turiones en gran cantidad pueden irritar los riñones.'
  },
  'asparagus setaceus': { edible: true, toxic: false },
  'asphodeline lutea': { edible: true, toxic: false },
  'asphodelus albus': {
    edible: true,
    toxic: true,
    toxicityNotes: 'La raíz es venenosa.'
  },
  'asphodelus fistulosus': { edible: true, toxic: false },
  'astragalus glycyphyllos': {
    edible: true,
    toxicityNotes:
      'Muchas especies del género contienen glucósidos tóxicos y pueden acumular selenio en suelos ricos en él. Las de vaina comestible tienen vainas carnosas y redondeadas.'
  },
  'atropa belladonna': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es muy venenosa, sobre todo la raíz, y tocarla con heridas en las manos ha causado problemas. Muy peligrosa para niños: sus bayas son atractivas y dulces.'
  },
  'avena sativa': { edible: true, toxic: false },
  'backhousia myrtifolia': { edible: false, toxic: false },
  'bacopa monnieri': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal puede causar náuseas y molestias digestivas.'
  },
  'bambusa oldhamii': { edible: true, toxic: false },
  'bambusa vulgaris': { edible: true, toxic: false },
  'banksia integrifolia': { edible: true, toxic: false },
  'baptisia australis': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Se considera potencialmente tóxica.'
  },
  'barbarea verna': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Como otras brásicas, sus glucosinolatos afectan al tiroides: con moderación si hay problemas tiroideos. Cultivarla con buena luz para que no acumule nitratos.'
  },
  'bauhinia variegata': { edible: true, toxic: false },
  'bellis perennis': { edible: true, toxic: false },
  'benincasa hispida': { edible: true, toxic: false },
  'berberis aquifolium': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene berberina: evitar en el embarazo, la lactancia y con hipertiroidismo. Dosis altas causan vómitos, bajada de tensión y de pulso e irritación renal.'
  },
  'berberis aristata': { edible: true, toxic: false },
  'berberis darwinii': { edible: true, toxic: false },
  'berberis thunbergii': { edible: true, toxic: false },
  'berberis vulgaris': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La corteza en dosis de 4 mg o más causa estupor, hemorragias nasales, vómitos, diarrea e irritación renal. Contraindicada en el embarazo (riesgo de aborto). Los frutos se consumen.'
  },
  'bergera koenigii': { edible: true, toxic: false },
  'beta vulgaris': { edible: true, toxic: false },
  'beta vulgaris var. cicla': { edible: true, toxic: false },
  'boehmeria macrophylla': {
    edible: false,
    toxic: false,
    toxicityNotes:
      'Aunque es de la familia de las ortigas, no tiene pelos urticantes.'
  },
  'boehmeria nivea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Aunque es de la familia de las ortigas, no tiene pelos urticantes.'
  },
  'borago officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y flores contienen pocos alcaloides pirrolizidínicos, dañinos para el hígado solo si se comen a diario en cantidad; evitarla con problemas hepáticos. El aceite de semilla no los tiene.'
  },
  'bouteloua gracilis': { edible: true, toxic: false },
  'brassica carinata': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El aceite de la semilla puede ser rico en ácido erúcico, tóxico; los cultivares modernos casi no lo tienen.'
  },
  'brassica juncea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Posible alergia a la mostaza, sobre todo en niños y adolescentes. Las semillas tomadas enteras pueden quedar retenidas en el intestino.'
  },
  'brassica napus var. napobrassica': { edible: true, toxic: false },
  'brassica napus var. napus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El aceite de la semilla de algunas variedades puede ser rico en ácido erúcico, tóxico; los cultivares modernos casi no lo tienen.'
  },
  'brassica nigra': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En grandes cantidades, semillas y vainas han intoxicado al ganado. Posible alergia a la mostaza.'
  },
  'brassica oleracea var. acephala': { edible: true, toxic: false },
  'brassica oleracea var. alboglabra': { edible: true, toxic: false },
  'brassica oleracea var. botrytis': { edible: true, toxic: false },
  'brassica oleracea var. botrytis f. romanesco': {
    edible: true,
    toxic: false
  },
  'brassica oleracea var. capitata': { edible: true, toxic: false },
  'brassica oleracea var. gemmifera': { edible: true, toxic: false },
  'brassica oleracea var. gongylodes': { edible: true, toxic: false },
  'brassica oleracea var. italica': { edible: true, toxic: false },
  'brassica oleracea var. sabauda': { edible: true, toxic: false },
  'brassica oleracea var. sabellica': { edible: true, toxic: false },
  'brassica oleracea var. viridis': { edible: true, toxic: false },
  'brassica rapa var. chinensis': { edible: true, toxic: false },
  'brassica rapa var. japonica': { edible: true, toxic: false },
  'brassica rapa var. komatsuna': { edible: true, toxic: false },
  'brassica rapa var. narinosa': { edible: true, toxic: false },
  'brassica rapa var. parachinensis': { edible: true, toxic: false },
  'brassica rapa var. pekinensis': { edible: true, toxic: false },
  'brassica rapa var. rapa': { edible: true, toxic: false },
  'brassica rapa var. rapifera': { edible: true, toxic: false },
  'bromelia karatas': {
    edible: true,
    toxic: false,
    toxicityNotes: 'Los frutos tienen pelos finos urticantes.'
  },
  'bromelia pinguin': { edible: true, toxic: false },
  'bromus carinatus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Segura bien procesada. Las aristas pueden irritar boca y garganta; descartar granos mohosos u oscuros. Puede no ser apta con sensibilidad al gluten.'
  },
  'bromus inermis': { edible: false, toxic: false },
  'bunium persicum': { edible: true, toxic: false },
  'cajanus cajan': { edible: true, toxic: false },
  'calamintha nepeta': { edible: true, toxic: false },
  'calandrinia ciliata': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene ácido oxálico: segura en poca cantidad, pero en exceso impide absorber minerales. Cocinarla lo reduce; evitar con reuma, gota o cálculos.'
  },
  'calendula officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Bajo riesgo de dermatitis de contacto; posible alergia en personas sensibles a las compuestas (margaritas).'
  },
  'callicarpa americana': { edible: true, toxic: false },
  'callirhoe involucrata': { edible: true, toxic: false },
  'callitriche hermaphroditica': { edible: false, toxic: false },
  'calluna vulgaris': { edible: true, toxic: false },
  'caltha palustris': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta, sobre todo las partes viejas, contiene protoanemonina tóxica, que el calor destruye. La savia irrita la piel.'
  },
  'camellia japonica': { edible: true, toxic: false },
  'camellia reticulata': { edible: true, toxic: false },
  'camellia sasanqua': { edible: true, toxic: false },
  'camellia sinensis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Por la cafeína, precaución con problemas cardiacos o de tiroides y en el embarazo (máx. 300 mg/día). Los extractos concentrados de té verde pueden dañar el hígado.'
  },
  'capsella bursa-pastoris': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En dosis medicinales puede causar sedación y dificultad respiratoria. Evitar con hipertensión tratada, problemas de tiroides o corazón, alcohol y en el embarazo.'
  },
  'capsicum annuum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los frutos picantes irritan en exceso o al tocar los ojos, y la savia puede ampollar la piel. Las hojas de la familia suelen tener toxinas. Precaución con antidepresivos IMAO y antihipertensivos.'
  },
  'capsicum baccatum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las hojas de la familia suelen tener toxinas y la savia puede ampollar la piel. Precaución con antidepresivos IMAO y antihipertensivos. El fruto se come.'
  },
  'capsicum chinense': { edible: true, toxic: false },
  'capsicum frutescens': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las hojas de la familia suelen tener toxinas y la savia puede ampollar la piel. Precaución con antidepresivos IMAO y antihipertensivos. El fruto se come.'
  },
  'capsicum pubescens': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las hojas de la familia suelen tener toxinas y la savia puede ampollar la piel. Precaución con antidepresivos IMAO y antihipertensivos. El fruto se come.'
  },
  'caragana arborescens': {
    edible: true,
    toxic: false,
    toxicityNotes: 'Los informes de que contiene toxinas no se han confirmado.'
  },
  'carpobrotus acinaciformis': { edible: true, toxic: false },
  'carpobrotus edulis': { edible: true, toxic: false },
  'carthamus tinctorius': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Evitar en el embarazo y con defensas bajas en uso medicinal.'
  },
  'carum carvi': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene miristicina; en exceso puede dañar riñón e hígado. En cantidades culinarias es segura.'
  },
  'catharanthus roseus': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Toda la planta es venenosa si se ingiere (alcaloides).'
  },
  'celosia argentea': { edible: true, toxic: false },
  'cenchrus setaceus': { edible: true, toxic: false },
  'ceratonia siliqua': { edible: true, toxic: false },
  'cercis canadensis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene una saponina tóxica que se absorbe poco y la cocción destruye en gran parte. Las flores se comen.'
  },
  'cercis siliquastrum': { edible: true, toxic: false },
  'chaenomeles japonica': { edible: true, toxic: false },
  'chaenomeles speciosa': { edible: true, toxic: false },
  'chamaecrista fasciculata': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Se considera tóxica para el ganado.'
  },
  'chamaemelum nobile': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Posible alergia cruzada en personas alérgicas a la ambrosía y otras compuestas.'
  },
  'chamaenerion angustifolium': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Segura en cantidades moderadas. Raíces, tallos maduros y hojas viejas son acres, y los oxalatos de las hojas crudas irritan la boca; cocinarla lo suaviza.'
  },
  'chasmanthium latifolium': { edible: true, toxic: false },
  'chelidonium majus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa, aunque de toxicidad baja que el secado reduce. El jugo del tallo es muy irritante y alergénico.'
  },
  'chelone glabra': { edible: false, toxic: false },
  'chenopodium berlandieri': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas tienen muchos oxalatos y saponinas y queman la boca: evitarlas o comerlas en poca cantidad y bien cocinadas. Las semillas cocinadas son seguras; crudas y en cantidad no, por las saponinas, que la cocción neutraliza.'
  },
  'chenopodium quinoa': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las semillas tienen saponinas amargas: lavarlas bien antes de cocinarlas. Se absorben poco y la cocción las reduce.'
  },
  'chionanthus virginicus': { edible: true, toxic: false },
  'choisya ternata': { edible: false, toxic: false },
  'chrozophora tinctoria': { edible: true, toxic: false },
  'cicer arietinum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y vainas tienen ácido oxálico, que irrita la piel y en exceso impide absorber el calcio; la cocción lo reduce mucho.'
  },
  'cichorium endivia var. crispum': { edible: true, toxic: false },
  'cichorium intybus var. foliosum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Se considera segura y se consume ampliamente. El riesgo práctico es recolectarla en cunetas o suelos contaminados; lavar bien.'
  },
  'cinnamomum verum': { edible: true, toxic: false },
  'cissus quadrangularis': { edible: true, toxic: false },
  'citrullus lanatus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'citrus hystrix': { edible: true, toxic: false },
  'citrus japonica': { edible: true, toxic: false },
  'citrus reticulata': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin toxicidad relevante; la piel en uso medicinal tiene contraindicaciones menores.'
  },
  'citrus × paradisi': { edible: true, toxic: false },
  'clarkia purpurea': { edible: true, toxic: false },
  'clarkia unguiculata': { edible: true, toxic: false },
  'claytonia lanceolata': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La planta no es tóxica; el riesgo es confundir sus tubérculos con los de plantas bulbosas venenosas. Recoger solo los unidos a una planta bien identificada.'
  },
  'claytonia perfoliata': { edible: true, toxic: false },
  'claytonia sibirica': { edible: true, toxic: false },
  'claytonia virginica': { edible: true, toxic: false },
  'clerodendrum bungei': { edible: false, toxic: false },
  'clerodendrum trichotomum': { edible: true, toxic: false },
  'clinopodium vulgare': { edible: true, toxic: false },
  'clitoria ternatea': { edible: true, toxic: false },
  'coccinia grandis': { edible: true, toxic: false },
  'colocasia esculenta': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Cruda contiene cristales de oxalato cálcico que pinchan boca y lengua. Cocinarla bien, secarla o remojarla los neutraliza.'
  },
  'corchorus capsularis': { edible: true, toxic: false },
  'corchorus olitorius': { edible: true, toxic: false },
  'cordia alliodora': { edible: true, toxic: false },
  'coriandrum sativum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Narcótica solo en cantidades muy grandes. En polvo o aceite puede dar alergia y fotosensibilidad.'
  },
  'cortaderia selloana': { edible: false, toxic: false },
  'corydalis cava': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Las especies de Corydalis son potencialmente tóxicas en dosis moderadas.'
  },
  'corydalis solida': {
    edible: true,
    toxic: true,
    toxicityNotes: 'La planta es venenosa.'
  },
  'cosmos bipinnatus': { edible: false, toxic: false },
  'crataegus monogyna': { edible: true, toxic: false },
  'crataegus phaenopyrum': { edible: true, toxic: false },
  'crithmum maritimum': { edible: true, toxic: false },
  'crocus nudiflorus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Probablemente como el azafrán: segura en uso normal, pero venenosa en dosis altas.'
  },
  'crocus sativus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Segura en uso culinario normal, pero 5-10 g de azafrán han llegado a causar la muerte.'
  },
  'crotalaria juncea': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas contienen alcaloides pirrolizidínicos tóxicos y son venenosas para vacas, caballos y cerdos.'
  },
  'croton tiglium': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa y las semillas, muy venenosas: cuatro pueden matar a un adulto. Su aceite es extremadamente vesicante.'
  },
  'cucumis anguria': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cucumis melo': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cucumis metuliferus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cucumis sativus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cucurbita argyrosperma': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cucurbita ficifolia': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cucurbita maxima': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cucurbita moschata': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cucurbita pepo': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla germinada produce una sustancia tóxica en el embrión; el fruto y las semillas sin germinar son seguros.'
  },
  'cuminum cyminum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede bajar el azúcar en sangre: precaución en diabéticos y con barbitúricos.'
  },
  'cyclamen hederifolium': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Venenosa, sobre todo el tubérculo.'
  },
  'cyclanthera pedata': { edible: true, toxic: false },
  'cydonia oblonga': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La semilla es venenosa: contiene cianuro de hidrógeno, que en exceso puede causar insuficiencia respiratoria. El fruto se come.'
  },
  'cymbalaria muralis': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Podría ser ligeramente tóxica.'
  },
  'cymbopogon citratus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Manipularla puede irritar la piel o dar alergia; las hojas cortan.'
  },
  'cynara scolymus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede causar dermatitis alérgica por sus lactonas. Precaución con obstrucción biliar y en la lactancia.'
  },
  'cynodon dactylon': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'En ciertas condiciones produce ácido cianhídrico y es potencialmente tóxica para el ganado. Puede causar dermatitis y su polen, mucha alergia.'
  },
  'cynoglossum officinale': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene alcaloides cancerígenos si se consume en cantidad y se considera ligeramente venenosa (ha intoxicado ganado). Puede causar dermatitis.'
  },
  'cyperus esculentus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Al crecer en zonas húmedas puede llevar patógenos: lavar bien y cocinar si es posible.'
  },
  'cyperus papyrus': { edible: true, toxic: false },
  'cytisus scoparius': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Citada a veces como venenosa, pero su toxicidad es muy baja o nula.'
  },
  'dactylis glomerata': {
    edible: false,
    toxic: false,
    toxicityNotes: 'Su polen es una causa importante de alergia.'
  },
  'dalea purpurea': {
    edible: true,
    toxic: false,
    toxicityNotes: 'El sabor varía entre plantas: probar antes de recolectar.'
  },
  'dasiphora fruticosa': { edible: true, toxic: false },
  'datura inoxia': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene narcóticos y es muy venenosa incluso en dosis pequeñas, como todo el género.'
  },
  'datura metel': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene narcóticos y es muy venenosa incluso en dosis pequeñas, como todo el género.'
  },
  'datura stramonium': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Contiene narcóticos y es muy venenosa incluso en dosis pequeñas, como todo el género.'
  },
  'daucus carota': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede dar alergia en algunas personas, y el contacto con la savia de la planta puede causar fotosensibilidad o dermatitis.'
  },
  'debregeasia edulis': { edible: true, toxic: false },
  'delphinium elatum': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Toda la planta es tóxica, sobre todo cuando es joven.'
  },
  'descurainia sophia': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede acumular minerales del suelo: evitar suelos contaminados. Las hojas crudas son muy fuertes y pueden irritar si se comen en cantidad.'
  },
  'deutzia scabra': { edible: true, toxic: false },
  'dianella caerulea': { edible: true, toxic: false },
  'dianthus barbatus': { edible: true, toxic: false },
  'dianthus caryophyllus': { edible: true, toxic: false },
  'dicentra cucullaria': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Potencialmente venenosa; puede causar sarpullidos.'
  },
  'dicentra eximia': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Mortal en grandes cantidades: temblores, vómitos, diarrea y convulsiones. La savia irrita levemente la piel.'
  },
  'dicentra spectabilis': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Potencialmente venenosa; puede causar sarpullidos.'
  },
  'digitalis ferruginea': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Toda la planta es venenosa (glucósidos cardiacos).'
  },
  'digitalis lanata': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa (glucósidos cardiacos) y puede ser mortal, sobre todo para niños. No automedicarse.'
  },
  'digitalis lutea': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa (glucósidos cardiacos), aunque menos que la dedalera común.'
  },
  'digitalis purpurea': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es muy venenosa (glucósidos cardiacos) y puede ser mortal, sobre todo para niños. No automedicarse.'
  },
  'digitaria sanguinalis': {
    edible: true,
    toxicityNotes: 'Hay un informe de que las hojas podrían ser cianogénicas.'
  },
  'diplotaxis tenuifolia': { edible: true, toxic: false },
  'dracocephalum moldavica': { edible: true, toxic: false },
  'echinacea purpurea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Uso habitual puede reducir la inmunidad; dosis altas causan mareo. Se recomiendan ciclos de 10-14 días con descansos.'
  },
  'echinochloa crus-galli': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede acumular nitratos tóxicos para el ganado, sobre todo con abonos químicos.'
  },
  'echium plantagineum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Por sus alcaloides pirrolizidínicos es venenosa para el ganado, sobre todo para caballos. Irrita la piel: manipular con guantes.'
  },
  'echium vulgare': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas son venenosas, aunque no hay casos registrados. Los pelos de hojas y tallos pueden causar dermatitis grave.'
  },
  'eleocharis dulcis': { edible: true, toxic: false },
  'eleusine coracana': { edible: true, toxic: false },
  'elsholtzia ciliata': { edible: true, toxic: false },
  'elymus canadensis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las aristas irritan al manipularlas. Recoger el grano limpio y bien seco, lejos de cunetas o campos fumigados.'
  },
  'empetrum nigrum': { edible: true, toxic: false },
  'epigaea repens': { edible: true, toxic: false },
  'epilobium angustifolium': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Segura en cantidades moderadas. Raíces, tallos maduros y hojas viejas son acres, y los oxalatos de las hojas crudas irritan la boca; cocinarla lo suaviza.'
  },
  'epilobium glabellum': { edible: true, toxic: false },
  'epilobium hirsutum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hay informes de que podría ser venenosa y de que causa convulsiones.'
  },
  'epilobium latifolium': { edible: true, toxic: false },
  'equisetum arvense': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'En grandes cantidades es tóxica: su tiaminasa destruye la vitamina B. El calor o el secado completo la eliminan.'
  },
  'equisetum fluviatile': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'En grandes cantidades es tóxica: su tiaminasa destruye la vitamina B. El calor o el secado completo la eliminan.'
  },
  'equisetum hyemale': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'En grandes cantidades es tóxica: su tiaminasa destruye la vitamina B. El calor o el secado completo la eliminan.'
  },
  'equisetum palustre': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'En grandes cantidades es tóxica: su tiaminasa destruye la vitamina B. El calor o el secado completo la eliminan.'
  },
  'eragrostis curvula': { edible: true, toxic: false },
  'eragrostis pilosa': { edible: true, toxic: false },
  'eragrostis tef': { edible: true, toxic: false },
  'erica tetralix': { edible: false, toxic: false },
  'erica vagans': { edible: false, toxic: false },
  'eriobotrya japonica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La semilla es ligeramente venenosa (cianuro de hidrógeno): no comerla, sobre todo si amarga. El fruto se come.'
  },
  'eruca vesicaria': { edible: true, toxic: false },
  'eschscholzia californica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene varios alcaloides, sobre todo en las hojas, y es sedante: no tratarla como alimento. Solo en pequeñas cantidades; evitar en el embarazo, en niños y con sedantes.'
  },
  'eugenia brasiliensis': { edible: true, toxic: false },
  'eugenia uniflora': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas son muy resinosas y tóxicas; el polen puede dar alergia. El fruto se come.'
  },
  'euonymus japonicus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas son probablemente venenosas, y quizá otras partes de la planta.'
  },
  'euphorbia helioscopia': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Su látex es tóxico ingerido y muy irritante: causa reacciones de fotosensibilidad e inflamación grave, sobre todo en ojos y heridas. Sigue siendo tóxico seco. Evitar el contacto prolongado (cancerígeno).'
  },
  'euphorbia lactea': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Su látex es tóxico ingerido y muy irritante: inflamación grave y fotosensibilidad, sobre todo en ojos y heridas. Tiene espinas. Evitar el contacto prolongado (cancerígeno).'
  },
  'euphorbia lathyris': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Su látex es tóxico ingerido y muy irritante (inflamación grave y fotosensibilidad, sobre todo en ojos y heridas), también seco. Las semillas son venenosas.'
  },
  'euphorbia marginata': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Su látex es tóxico ingerido y muy irritante: causa reacciones de fotosensibilidad e inflamación grave, sobre todo en ojos y heridas. Sigue siendo tóxico seco. Evitar el contacto prolongado (cancerígeno).'
  },
  'euphorbia tirucalli': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Su látex cáustico es muy venenoso: lesiona gravemente los ojos (ceguera temporal), ampolla la piel y causa vómitos y diarrea si se ingiere.'
  },
  'fargesia nitida': { edible: false, toxic: false },
  'festuca ovina': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin problemas de toxicidad en el grano: recoger solo grano maduro y limpio y descartar espigas mohosas.'
  },
  'foeniculum vulgare': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La savia o el aceite esencial pueden causar fotosensibilidad o dermatitis; ingerir el aceite causa vómitos y convulsiones. Evitar en niños pequeños y con enfermedad hepática. Uso culinario seguro.'
  },
  'fontanesia phillyreoides': { edible: false, toxic: false },
  'forestiera pubescens': {
    edible: true,
    toxicityNotes:
      'Los frutos maduros probablemente no son tóxicos en poca cantidad, pero no hay que comerlos en cantidad ni consumir hojas ni corteza.'
  },
  'forsythia viridissima': {
    edible: false,
    toxicityNotes:
      'Las hojas contienen el glucósido filirina, de potencia desconocida.'
  },
  'forsythia × intermedia': { edible: false, toxic: false },
  'fragaria vesca': { edible: true, toxic: false },
  'fragaria × ananassa': { edible: true, toxic: false },
  'fraxinus americana': { edible: true, toxic: false },
  'fraxinus excelsior': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Venenosa para rumiantes; ha causado dermatitis en algunas personas.'
  },
  'fraxinus ornus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El contacto con la savia ha causado alergias en algunas personas.'
  },
  'fuchsia boliviana': { edible: true, toxic: false },
  'fuchsia coccinea': { edible: true, toxic: false },
  'fuchsia magellanica': { edible: true, toxic: false },
  'fumaria officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En dosis medicinales, evitar con epilepsia, glaucoma, en el embarazo y la lactancia; potencia los antihipertensivos.'
  },
  'galega officinalis': {
    edible: true,
    toxicityNotes:
      'Hay algunos informes de toxicidad para mamíferos, aunque se usa como forraje para aumentar la leche.'
  },
  'galeopsis ladanum': {
    edible: false,
    toxic: true,
    toxicityNotes: 'La planta es venenosa y puede causar parálisis.'
  },
  'galeopsis tetrahit': {
    edible: false,
    toxic: true,
    toxicityNotes: 'La planta es venenosa y puede causar parálisis.'
  },
  'gaultheria procumbens': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'El aceite esencial puro es tóxico en dosis altas y puede agravar úlceras. No usar con alergia a la aspirina ni en menores de 12 años. Puede causar dermatitis.'
  },
  'gaultheria shallon': { edible: true, toxic: false },
  'gaylussacia baccata': { edible: true, toxic: false },
  'genista tinctoria': { edible: true, toxic: false },
  'geranium incanum': { edible: true, toxic: false },
  'geranium macrorrhizum': { edible: false, toxic: false },
  'geranium maculatum': { edible: false, toxic: false },
  'geranium molle': { edible: false, toxic: false },
  'geranium pratense': { edible: false, toxic: false },
  'geranium pusillum': { edible: false, toxic: false },
  'geranium robertianum': { edible: false, toxic: false },
  'geranium sylvaticum': { edible: false, toxic: false },
  'geranium wallichianum': { edible: false, toxic: false },
  'gevuina avellana': { edible: true, toxic: false },
  'glaucium flavum': {
    edible: true,
    toxic: true,
    toxicityNotes: 'La raíz es venenosa.'
  },
  'glechoma hederacea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Usar con precaución en dosis medicinales: posiblemente tóxica para caballos. Evitar en el embarazo, con epilepsia o enfermedad renal.'
  },
  'gleditsia triacanthos': {
    edible: true,
    toxicityNotes:
      'La planta contiene compuestos potencialmente tóxicos (sin detalle). Tiene espinas grandes.'
  },
  'glycine max': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La semilla madura cruda es tóxica y hay que cocinarla bien. Los brotes crudos se consideran sanos.'
  },
  'glycyrrhiza glabra': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Una sobredosis de raíz causa edemas, hipertensión e insuficiencia cardiaca; en exceso, dolor de cabeza y pérdida de potasio. No usar más de 6 semanas; precaución en el embarazo o con cirrosis.'
  },
  'gmelina arborea': { edible: true, toxic: false },
  'gossypium arboreum': { edible: true, toxic: false },
  'gossypium hirsutum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Algunas formas contienen gosipol, tóxico, sobre todo en la semilla; los cultivares sin glándulas no lo tienen.'
  },
  'gratiola officinalis': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Toda la planta es venenosa.'
  },
  'grevillea robusta': { edible: true, toxic: false },
  'hedeoma pulegioides': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'En grandes cantidades, sobre todo como aceite esencial, es tóxica por vía interna; el aceite puro causa dermatitis.'
  },
  'hedychium coronarium': { edible: true, toxic: false },
  'helianthus annuus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las semillas son seguras; desechar las mohosas o rancias. La planta acumula nitratos con abonos químicos y el polen puede dar alergia. Los fragmentos de cáscara pueden irritar la garganta.'
  },
  'helianthus tuberosus': { edible: true, toxic: false },
  'helichrysum italicum': { edible: true, toxic: false },
  'heliotropium arborescens': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Las semillas son venenosas.'
  },
  'helleborus foetidus': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa y su veneno posiblemente se absorbe por la piel.'
  },
  'helleborus niger': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa y su veneno posiblemente se absorbe por la piel; la raíz fresca irrita mucho la piel.'
  },
  'helosciadium nodiflorum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'No se considera tóxica, pero se confunde con Berula erecta, tóxica para el ganado.'
  },
  'hevea brasiliensis': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas contienen compuestos cianogénicos y son venenosas sin tratar. Manipular la planta puede irritar la piel o dar alergia (látex).'
  },
  'hibiscus cannabinus': { edible: true, toxic: false },
  'hibiscus moscheutos': { edible: true, toxic: false },
  'hibiscus mutabilis': { edible: true, toxic: false },
  'hibiscus rosa-sinensis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'No usar en el embarazo ni si se busca descendencia (uso medicinal).'
  },
  'hibiscus sabdariffa': { edible: true, toxic: false },
  'hibiscus syriacus': { edible: true, toxic: false },
  'hibiscus trionum': { edible: true, toxic: false },
  'hippuris vulgaris': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Recoger solo de aguas que se sepan limpias: aunque parezcan claras, pueden llevar parásitos, bacterias o contaminación.'
  },
  'hordeum vulgare': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene gluten: no apta para celíacos ni personas con sensibilidad al gluten. La harina puede causar asma.'
  },
  'hottonia palustris': { edible: false, toxic: false },
  'hydrangea arborescens': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Puede causar mareo, dolor torácico y trastornos digestivos.'
  },
  'hydrangea aspera': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Se ha descrito que la planta fresca contiene cianuro de hidrógeno, que en exceso puede causar insuficiencia respiratoria e incluso la muerte.'
  },
  'hydrangea macrophylla': { edible: true, toxic: false },
  'hydrangea paniculata': { edible: true, toxic: false },
  'hydrangea serrata': { edible: true, toxic: false },
  'hylotelephium spectabile': { edible: true, toxic: false },
  'hypericum androsaemum': { edible: false, toxic: false },
  'hypericum calycinum': { edible: false, toxic: false },
  'hypericum perforatum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Tocar la savia o ingerir la planta puede causar fotosensibilidad. Interacciona con antidepresivos (síndrome serotoninérgico), anticonceptivos y otros fármacos.'
  },
  'hyssopus officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Su aceite esencial puede causar convulsiones: evitar con epilepsia. Uso culinario sin problema.'
  },
  'impatiens balsamina': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene probablemente oxalato cálcico, dañino crudo; se destruye cocinándola o secándola. No comer en grandes cantidades; evitar con reuma, artritis, gota o cálculos.'
  },
  'impatiens noli-tangere': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene probablemente oxalato cálcico, dañino crudo; se destruye cocinándola o secándola. No comer en grandes cantidades; evitar con reuma, artritis, gota o cálculos.'
  },
  'imperata cylindrica': { edible: true, toxic: false },
  'inula helenium': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede dar alergias e interferir con tratamientos de diabetes e hipertensión.'
  },
  'iris cristata': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Muchas especies del género se consideran venenosas, sobre todo las raíces. Puede irritar la piel o dar alergia.'
  },
  'iris ensata': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Muchas especies del género se consideran venenosas, sobre todo las raíces. Puede irritar la piel o dar alergia.'
  },
  'iris foetidissima': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Las raíces son tóxicas para el ganado; la planta puede irritar la piel o causar alergia.'
  },
  'iris germanica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas y sobre todo rizomas contienen irisina, que ingerida causa trastornos gástricos graves. Puede irritar la piel o causar alergia.'
  },
  'iris pseudacorus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas y sobre todo rizomas contienen irisina, que ingerida causa trastornos gástricos graves. Puede irritar la piel o causar alergia.'
  },
  'iris sibirica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Muchas especies del género se consideran venenosas, sobre todo las raíces. Puede irritar la piel o dar alergia.'
  },
  'iris tectorum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Muchas especies del género se consideran venenosas, sobre todo las raíces. Puede irritar la piel o dar alergia.'
  },
  'jamesia americana': {
    edible: true,
    toxicityNotes:
      'Hay registros de consumo ocasional del fruto fresco, pero apenas hay información toxicológica moderna sobre las cápsulas y semillas: tomarla con prudencia.'
  },
  'jasminum humile': { edible: true, toxic: false },
  'jasminum officinale': { edible: true, toxic: false },
  'jasminum sambac': {
    edible: true,
    toxic: false,
    toxicityNotes: 'El extracto de jazmín tiene una toxicidad aguda baja.'
  },
  'jatropha curcas': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta es muy purgante y venenosa, en especial las semillas y su aceite (curcasina); la resina de la semilla causa erupciones en la piel.'
  },
  'jeffersonia diphylla': { edible: false, toxic: false },
  'kalmia angustifolia': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Toda la planta es muy tóxica, también para los animales.'
  },
  'kalmia latifolia': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es muy tóxica, también para los animales; incluso la carne de animales que la han comido ha intoxicado a personas.'
  },
  'kickxia elatine': { edible: false, toxic: false },
  'kniphofia uvaria': { edible: false, toxic: false },
  'koeleria macrantha': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El grano es seguro bien identificado y procesado. Descartar espigas con cornezuelo, moho o contaminadas.'
  },
  'laburnum alpinum': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Toda la planta es venenosa, especialmente las semillas.'
  },
  'laburnum anagyroides': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Toda la planta es venenosa, especialmente las semillas.'
  },
  'lactuca sativa': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La planta madura (espigada) es ligeramente tóxica por su látex; las hojas en su punto de cosecha se comen sin problema.'
  },
  'lagenaria siceraria': { edible: true, toxic: false },
  'lantana camara': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas y semillas son tóxicas, y las bayas verdes causan vómitos, diarrea y dificultad respiratoria. Las hojas pueden causar dermatitis.'
  },
  'lathyrus latifolius': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene latirógenos: su consumo frecuente causa trastornos nerviosos y óseos graves. Hervirla los reduce, pero no los elimina; comer solo ocasionalmente.'
  },
  'lathyrus odoratus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La semilla contiene una toxina que causa problemas reproductivos y artritis degenerativa. No es comestible.'
  },
  'lathyrus sativus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La semilla tiene un aminoácido tóxico que en grandes cantidades causa latirismo, una grave enfermedad nerviosa. En poca cantidad es segura: no debe pasar del 30 % de la dieta.'
  },
  'laurus nobilis': { edible: true, toxic: false },
  'lavandula angustifolia': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Su aceite esencial puede raramente causar sensibilización en la piel.'
  },
  'lavandula dentata': { edible: false, toxic: false },
  'lavandula latifolia': { edible: true, toxic: false },
  'lavandula stoechas': { edible: false, toxic: false },
  'lavatera arborea': { edible: true, toxic: false },
  'lens culinaris': { edible: true, toxic: false },
  'leonurus cardiaca': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede causar dermatitis y fotosensibilidad. Evitar en el embarazo (estimula el útero).'
  },
  'lepidium sativum': { edible: true, toxic: false },
  'lespedeza cuneata': { edible: true, toxic: false },
  'leucanthemum maximum': { edible: false, toxic: false },
  'leucothoe axillaris': {
    edible: false,
    toxicityNotes:
      'No hay registros de toxicidad de esta especie, pero al menos otra del género tiene frutos venenosos.'
  },
  'levisticum officinale': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene miristicina y su aceite esencial es irritante. Contraindicada con inflamación renal o urinaria y en el embarazo, en dosis medicinales.'
  },
  'lewisia rediviva': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin toxicidad relevante conocida; pelar la raíz antes de cocinarla mejora el sabor.'
  },
  'ligustrum japonicum': {
    edible: true,
    toxicityNotes:
      'Sin registros de esta especie, pero al menos un aligustre es ligeramente tóxico y otros probablemente también.'
  },
  'ligustrum lucidum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'El fruto es ligeramente tóxico, y probablemente otras partes también.'
  },
  'ligustrum ovalifolium': {
    edible: false,
    toxicityNotes:
      'Sin registros de esta especie, pero al menos un aligustre es ligeramente tóxico y otros probablemente también.'
  },
  'ligustrum vulgare': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Venenosa, aunque de toxicidad muy baja: comer los frutos suele causar vómitos o nada.'
  },
  'linaria vulgaris': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Un informe indica que podría ser ligeramente tóxica.'
  },
  'lindera benzoin': { edible: true, toxic: false },
  'lindera glauca': { edible: true, toxic: false },
  'lippia nodiflora': { edible: true, toxic: false },
  'litsea cubeba': { edible: true, toxic: false },
  'lobularia maritima': { edible: true, toxic: false },
  'lolium perenne': { edible: true, toxic: false },
  'lotus corniculatus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta contiene glucósidos cianogénicos (cianuro de hidrógeno), que en exceso causan insuficiencia respiratoria.'
  },
  'lotus tetragonolobus': { edible: true, toxic: false },
  'ludwigia palustris': { edible: false, toxic: false },
  'luma apiculata': { edible: true, toxic: false },
  'lupinus albus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas de muchas variedades contienen alcaloides amargos tóxicos; las variedades dulces son seguras. El amargor delata la toxicidad. Se eliminan remojando la semilla toda la noche, desechando el agua y cambiándola durante la cocción. La semilla triturada se contamina fácilmente con hongos.'
  },
  'lupinus angustifolius': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas de muchas variedades contienen alcaloides amargos tóxicos; las variedades dulces son seguras. El amargor delata la toxicidad. Se eliminan remojando la semilla toda la noche, desechando el agua y cambiándola durante la cocción. La semilla triturada se contamina fácilmente con hongos.'
  },
  'lupinus luteus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas de muchas variedades contienen alcaloides amargos tóxicos; las variedades dulces son seguras. Se eliminan remojando la semilla toda la noche, desechando el agua y cambiándola durante la cocción.'
  },
  'lupinus polyphyllus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas de muchas variedades contienen alcaloides amargos tóxicos; las variedades dulces son seguras. El amargor delata la toxicidad. Se eliminan remojando la semilla toda la noche, desechando el agua y cambiándola durante la cocción. La semilla triturada se contamina fácilmente con hongos.'
  },
  'lycium barbarum': {
    edible: true,
    toxicityNotes:
      'Sin registros de toxicidad, pero pertenece a una familia con toxinas: precaución con las hojas (aunque se comen en algunas zonas) y el fruto verde. El fruto maduro es sano.'
  },
  'lycium chinense': {
    edible: true,
    toxicityNotes:
      'Pertenece a una familia con toxinas: precaución con las hojas, aunque su consumo está extendido en algunas zonas. El fruto maduro se come.'
  },
  'lycopus europaeus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal agranda el tiroides: evitar con enfermedades o tratamientos del tiroides y en el embarazo.'
  },
  'lycopus virginicus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal agranda el tiroides: evitar con enfermedades o tratamientos del tiroides y en el embarazo.'
  },
  'lyonia ovalifolia': { edible: false, toxic: false },
  'lysimachia barystachys': { edible: true, toxic: false },
  'lysimachia clethroides': { edible: true, toxic: false },
  'lysimachia nummularia': { edible: true, toxic: false },
  'lysimachia quadrifolia': { edible: true, toxic: false },
  'lysimachia vulgaris': { edible: true, toxic: false },
  'macleaya cordata': {
    edible: false,
    toxic: true,
    toxicityNotes: 'La savia es muy venenosa.'
  },
  'mahonia nervosa': { edible: true, toxic: false },
  'malus domestica': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las semillas (pepitas) y quizá las hojas contienen cianuro de hidrógeno, el fruto no. Las pepitas tienen poco, pero no deben comerse en cantidad.'
  },
  'malus sylvestris': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las semillas (pepitas) y quizá las hojas contienen cianuro de hidrógeno, el fruto no. Las pepitas tienen poco, pero no deben comerse en cantidad.'
  },
  'manihot esculenta': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas y raíces contienen linamarina, que libera ácido cianhídrico; el calor la destruye. No comerla nunca cruda.'
  },
  'manihot glaziovii': { edible: true, toxic: false },
  'marrubium vulgare': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En dosis altas altera el ritmo cardiaco, la tensión y la glucosa. Evitar en el embarazo, la lactancia y con antidiabéticos.'
  },
  'matthiola incana': { edible: true, toxic: false },
  'meconopsis grandis': { edible: true, toxic: false },
  'medicago lupulina': { edible: true, toxic: false },
  'medicago polymorpha': { edible: true, toxic: false },
  'medicago sativa': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene saponinas: comer muchas hojas puede romper glóbulos rojos, aunque se absorben poco. La cocción y cambiar el agua las reduce. Los brotes en cantidad no son recomendables por la canavanina.'
  },
  'melaleuca alternifolia': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'No tomar internamente (el aceite): deprime el sistema nervioso y causa vómitos y diarrea.'
  },
  'melaleuca bracteata': { edible: false, toxic: false },
  'melilotus albus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas secas pueden ser tóxicas (la cumarina impide la coagulación de la sangre); las frescas son seguras.'
  },
  'melilotus officinalis': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas secas pueden ser tóxicas (la cumarina impide la coagulación de la sangre); las frescas son seguras.'
  },
  'melissa officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede irritar en concentraciones altas (aceite esencial) y en pieles sensibles. Evitar en el embarazo.'
  },
  'mentha aquatica': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin registros de toxicidad. En grandes cantidades, sobre todo como aceite esencial, algunas mentas pueden provocar abortos: precaución en el embarazo.'
  },
  'mentha arvensis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin registros de toxicidad. En grandes cantidades, sobre todo como aceite esencial, algunas mentas pueden provocar abortos: precaución en el embarazo.'
  },
  'mentha longifolia': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin registros de toxicidad. En grandes cantidades, sobre todo como aceite esencial, algunas mentas pueden provocar abortos: precaución en el embarazo.'
  },
  'mentha pulegium': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Tóxica en grandes cantidades, sobre todo el aceite esencial: puede causar abortos, vómitos, delirio y daño hepático. No usar en el embarazo ni con enfermedad hepática o renal.'
  },
  'mentha requienii': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin registros de toxicidad. En grandes cantidades, sobre todo como aceite esencial, algunas mentas pueden provocar abortos: precaución en el embarazo.'
  },
  'mentha spicata': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin registros de toxicidad. En grandes cantidades, sobre todo como aceite esencial, algunas mentas pueden provocar abortos: precaución en el embarazo.'
  },
  'mentha suaveolens': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sin registros de toxicidad. En grandes cantidades, sobre todo como aceite esencial, algunas mentas pueden provocar abortos: precaución en el embarazo.'
  },
  'menziesia ferruginea': { edible: true, toxic: false },
  'mercurialis annua': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La planta es venenosa, aunque menos que la mercurial perenne.'
  },
  'mesembryanthemum crystallinum': { edible: true, toxic: false },
  'meum athamanticum': { edible: true, toxic: false },
  'mimosa pudica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las raíces son tóxicas en dosis altas, y sus pinchos endurecidos inflaman el intestino del ganado.'
  },
  'miscanthus sinensis': { edible: true, toxic: false },
  'miscanthus × giganteus': { edible: false, toxic: false },
  'monarda didyma': { edible: true, toxic: false },
  'monarda fistulosa': { edible: true, toxic: false },
  'monarda punctata': { edible: true, toxic: false },
  'monotropa uniflora': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Contiene varios glucósidos y es posiblemente tóxica.'
  },
  'monstera deliciosa': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta contiene cristales de oxalato cálcico, tóxicos y muy irritantes en fresco. El fruto solo se come bien maduro; las partes verdes irritan boca y garganta.'
  },
  'montia fontana': { edible: true, toxic: false },
  'muhlenbergia rigens': { edible: true, toxic: false },
  'myosoton aquaticum': { edible: true, toxic: false },
  'myrtus communis': { edible: true, toxic: false },
  'nassella viridula': { edible: false, toxic: false },
  'nasturtium officinale': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Muy nutritiva, pero si se recoge silvestre en aguas que drenan pastos de ovejas puede llevar duela hepática: no comerla cruda. Cocinarla elimina el parásito.'
  },
  'nepeta cataria': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Diurética y sedante; fumada puede producir euforia y alucinaciones. Evitar en el embarazo y al conducir.'
  },
  'nerium oleander': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta es muy venenosa: una sola hoja ha matado a niños, y hasta usar su madera como pincho para carne ha sido mortal. Irrita la piel.'
  },
  'nicotiana alata': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Toda la planta es venenosa.'
  },
  'ocimum basilicum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Su aceite esencial contiene estragol, potencialmente cancerígeno: no tomarlo en el embarazo ni dar aceite de albahaca a niños. Uso culinario normal sin problema.'
  },
  'ocimum minimum': { edible: true, toxic: false },
  'ocimum tenuiflorum': { edible: true, toxic: false },
  'ocotea porosa': {
    edible: false,
    toxic: false,
    toxicityNotes: 'El serrín de su madera puede causar problemas de piel.'
  },
  'oenanthe javanica': {
    edible: true,
    toxicityNotes:
      'No hay datos de toxicidad de esta especie, pero su género incluye plantas muy venenosas: precaución. Contiene miristicina.'
  },
  'oenothera biennis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal baja el umbral de las crisis epilépticas; precaución con anticoagulantes y fenotiazinas. En ayunas puede dar dolor de cabeza y náuseas; en dosis altas, diarrea.'
  },
  'oenothera glazioviana': { edible: true, toxic: false },
  'olea europaea': { edible: true, toxic: false },
  'onobrychis viciifolia': { edible: true, toxic: false },
  'origanum dictamnus': { edible: true, toxic: false },
  'origanum majorana': { edible: true, toxic: false },
  'origanum onites': { edible: true, toxic: false },
  'origanum vulgare': { edible: true, toxic: false },
  'ornithogalum umbellatum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'El bulbo contiene alcaloides y es venenoso, también para el ganado; al tocarlo puede causar dermatitis.'
  },
  'ornithopus sativus': { edible: false, toxic: false },
  'oryza sativa': { edible: true, toxic: false },
  'osmanthus delavayi': { edible: false, toxic: false },
  'osmanthus fragrans': { edible: true, toxic: false },
  'osmanthus heterophyllus': { edible: false, toxic: false },
  'osmanthus × burkwoodii': { edible: false, toxic: false },
  'oxydendrum arboreum': { edible: true, toxic: false },
  'paeonia lactiflora': { edible: true, toxic: false },
  'panicum miliaceum': { edible: true, toxic: false },
  'panicum virgatum': { edible: false, toxic: false },
  'papaver argemone': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Tóxica para mamíferos, aunque de toxicidad baja. Las semillas no son tóxicas.'
  },
  'papaver dubium': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Tóxica para mamíferos, aunque de toxicidad baja. Las semillas no son tóxicas.'
  },
  'papaver nudicaule': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Tóxica para mamíferos, aunque de toxicidad baja.'
  },
  'papaver orientale': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Muchas especies del género son tóxicas para mamíferos, aunque de toxicidad baja.'
  },
  'papaver rhoeas': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Tóxica para mamíferos, aunque de toxicidad baja. Las semillas no son tóxicas.'
  },
  'papaver somniferum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene alcaloides muy tóxicos y adictivos (opiáceos) en la planta y el látex. Las semillas no tienen toxinas.'
  },
  'parthenocissus quinquefolia': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas pueden causar dermatitis al tocarlas en otoño (contienen rafidios irritantes) y hay indicios de que las bayas son venenosas.'
  },
  'parthenocissus tricuspidata': { edible: true, toxic: false },
  'pastinaca sativa': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El contacto con la savia de la planta puede causar fotosensibilidad o dermatitis. Contiene miristicina.'
  },
  'pelargonium capitatum': { edible: false, toxic: false },
  'pelargonium crispum': { edible: true, toxic: false },
  'pelargonium exstipulatum': { edible: true, toxic: false },
  'pelargonium fragrans': { edible: true, toxic: false },
  'pelargonium fulgidum': { edible: false, toxic: false },
  'pelargonium glutinosum': { edible: false, toxic: false },
  'pelargonium graveolens': { edible: true, toxic: false },
  'pelargonium odoratissimum': { edible: true, toxic: false },
  'pelargonium peltatum': { edible: true, toxic: false },
  'pelargonium quercifolium': { edible: false, toxic: false },
  'pelargonium radens': { edible: false, toxic: false },
  'pelargonium tomentosum': { edible: true, toxic: false },
  'pelargonium vitifolium': { edible: false, toxic: false },
  'pennisetum alopecuroides': { edible: true, toxic: false },
  'penstemon procerus': { edible: true, toxic: false },
  'persea americana': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'El fruto verde es venenoso, y la semilla molida se usa como cebo para ratas. El fruto maduro se come.'
  },
  'persea borbonia': { edible: true, toxic: false },
  'petroselinum crispum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Segura en las cantidades de las recetas, pero tóxica en exceso, sobre todo el aceite esencial; el contacto prolongado irrita la piel. Evitar dosis altas en el embarazo, con edemas o enfermedad renal.'
  },
  'phalaris arundinacea': { edible: false, toxic: false },
  'phaseolus coccineus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas maduras crudas son venenosas en grandes cantidades: cocinarlas bien.'
  },
  'phaseolus lunatus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La semilla madura cruda es venenosa (ácido cianhídrico); cocinarla bien destruye la toxina.'
  },
  'phaseolus vulgaris': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas maduras crudas son venenosas: unas pocas han intoxicado a niños con náuseas y diarrea. Cocinarlas bien. Las vainas tiernas se comen cocinadas.'
  },
  'phellodendron amurense': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En dosis altas causa náuseas y vómitos. Evitar en el embarazo por su berberina.'
  },
  'philadelphus coronarius': { edible: false, toxic: false },
  'philadelphus microphyllus': { edible: true, toxic: false },
  'phillyrea latifolia': { edible: true, toxic: false },
  'phleum pratense': {
    edible: false,
    toxic: false,
    toxicityNotes: 'Su polen es muy alergénico.'
  },
  'phragmites australis': { edible: true, toxic: false },
  'phyla nodiflora': { edible: true, toxic: false },
  'phyllanthus emblica': { edible: true, toxic: false },
  'physalis alkekengi': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Toda la planta salvo el fruto maduro es venenosa.'
  },
  'physalis peruviana': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta salvo el fruto es venenosa. El fruto se come maduro.'
  },
  'physalis philadelphica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta salvo el fruto es venenosa. El fruto se come maduro.'
  },
  'phytolacca acinosa': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas son venenosas (se dice que tiernas son seguras). Según otro informe solo es venenosa la forma de flores púrpura y raíz morada.'
  },
  'phytolacca americana': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas, semillas y raíz son venenosas (las hojas tiernas se consideran comestibles bien cocinadas). La savia causa dermatitis y contiene sustancias que dañan los cromosomas: usar guantes.'
  },
  'phytolacca dioica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas son venenosas (se dice que tiernas se pueden comer); el resto de la planta, incluido el fruto, probablemente también.'
  },
  'phytolacca esculenta': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas son venenosas. Se dice que tiernas se pueden comer y que las toxinas aparecen al crecer.'
  },
  'pieris japonica': {
    edible: false,
    toxic: true,
    toxicityNotes: 'La planta es venenosa.'
  },
  'pimpinella anisum': { edible: true, toxic: false },
  'pisum sativum': { edible: true, toxic: false },
  'plantago coronopus': { edible: true, toxic: false },
  'plantago crassifolia': { edible: true, toxic: false },
  'plantago lanceolata': { edible: true, toxic: false },
  'plantago major': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En dosis altas puede bajar la tensión y causar diarrea; posible dermatitis alérgica. Evitar con obstrucción intestinal.'
  },
  'plantago maritima': { edible: true, toxic: false },
  'plantago media': { edible: true, toxic: false },
  'plantago ovata': { edible: true, toxic: false },
  'plantago rugelii': { edible: true, toxic: false },
  'platystemon californicus': { edible: true, toxic: false },
  'poa annua': { edible: false, toxic: false },
  'poa pratensis': { edible: true, toxic: false },
  'polygala vulgaris': {
    edible: true,
    toxicityNotes:
      'Sin datos de esta especie, pero al menos una del género es venenosa en grandes cantidades.'
  },
  'poncirus trifoliata': { edible: true, toxic: false },
  'populus alba': { edible: true, toxic: false },
  'populus balsamifera': { edible: true, toxic: false },
  'populus deltoides': { edible: true, toxic: false },
  'populus grandidentata': { edible: true, toxic: false },
  'populus nigra': { edible: true, toxic: false },
  'populus tremula': { edible: true, toxic: false },
  'populus tremuloides': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sus salicilatos pueden causar ardor de estómago y zumbido de oídos: evitar con úlceras.'
  },
  'populus trichocarpa': { edible: true, toxic: false },
  'portulaca grandiflora': { edible: true, toxic: false },
  'primula auricula': { edible: false, toxic: false },
  'primula denticulata': { edible: true, toxic: false },
  'primula elatior': { edible: true, toxic: false },
  'primula parryi': { edible: false, toxic: false },
  'primula pauciflora': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene saponinas que pueden causar trastornos digestivos fuertes; su sabor jabonoso avisa. No es una verdura de ensalada.'
  },
  'primula sieboldii': { edible: true, toxic: false },
  'primula tetrandra': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Rica en saponinas, que causan trastornos digestivos e irritación, sobre todo en cantidad. No es una verdura de ensalada.'
  },
  'primula vulgaris': { edible: true, toxic: false },
  'prosopis juliflora': {
    edible: true,
    toxic: false,
    toxicityNotes: 'Tiene espinas: manipular con mucho cuidado.'
  },
  'prunella grandiflora': { edible: true, toxic: false },
  'prunella vulgaris': { edible: true, toxic: false },
  'prunus avium': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y semillas (huesos) producen cianuro de hidrógeno, normalmente en cantidad demasiado pequeña para hacer daño. No comer semillas ni frutos muy amargos.'
  },
  'prunus cerasifera': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y semillas (huesos) producen cianuro de hidrógeno, normalmente en cantidad demasiado pequeña para hacer daño. No comer semillas ni frutos muy amargos.'
  },
  'prunus domestica': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y semillas (huesos) producen cianuro de hidrógeno, normalmente en cantidad demasiado pequeña para hacer daño. No comer semillas ni frutos muy amargos.'
  },
  'prunus dulcis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y semillas (huesos) producen cianuro de hidrógeno, normalmente en cantidad demasiado pequeña para hacer daño. No comer semillas ni frutos muy amargos.'
  },
  'prunus persica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La semilla (hueso) puede tener mucho cianuro de hidrógeno, que se nota por el sabor amargo. No comer semillas ni frutos muy amargos.'
  },
  'prunus serrulata': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y semillas (huesos) producen cianuro de hidrógeno, normalmente en cantidad demasiado pequeña para hacer daño. No comer semillas ni frutos muy amargos.'
  },
  'prunus spinosa': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y huesos producen cianuro de hidrógeno, normalmente en cantidad demasiado pequeña para hacer daño. No comer semillas ni frutos muy amargos.'
  },
  'prunus virginiana': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas pueden contener mucho cianuro de hidrógeno, que se nota por el amargor. No comer semillas ni frutos muy amargos.'
  },
  'pseudolysimachion longifolium': { edible: true, toxic: false },
  'pseudolysimachion spurium': { edible: true, toxic: false },
  'pseudosasa amabilis': { edible: false, toxic: false },
  'pseudosasa japonica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Los brotes pueden contener cianógenos tóxicos, que la cocción elimina: no comerlos crudos. Evitar en el embarazo.'
  },
  'psidium cattleianum': { edible: true, toxic: false },
  'psidium guajava': { edible: true, toxic: false },
  'pueraria montana': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las hojas de una especie muy cercana tienen pelos con ganchos que irritan mucho la piel.'
  },
  'pycnanthemum incanum': { edible: true, toxic: false },
  'pycnanthemum muticum': { edible: true, toxic: false },
  'pycnanthemum virginianum': { edible: true, toxic: false },
  'pyrus communis': { edible: true, toxic: false },
  'pyrus pyrifolia': { edible: true, toxic: false },
  'ranunculus acris': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa; el calor o el secado destruyen las toxinas. Su jugo acre puede ampollar la piel.'
  },
  'ranunculus repens': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa; el calor o el secado destruyen las toxinas. Su jugo acre puede ampollar la piel.'
  },
  'raphanus sativus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los rábanos japoneses tienen más glucosinolatos, que afectan al tiroides; mejor pelarlos.'
  },
  'rhododendron ferrugineum': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Las hojas y las agallas son venenosas, y el polen probablemente también.'
  },
  'rhododendron indicum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Muchas especies del género tienen hojas venenosas, y el polen (y la miel que se hace con él) puede intoxicar.'
  },
  'rhododendron luteum': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Muchas especies del género tienen hojas venenosas, y el polen (y la miel que se hace con él) puede intoxicar.'
  },
  'rhododendron maximum': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Las hojas son venenosas y pueden causar convulsiones y coma; el polen probablemente también es tóxico.'
  },
  'rhododendron ponticum': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Muchas especies del género tienen hojas venenosas, y el polen (y la miel que se hace con él) puede intoxicar.'
  },
  'ricinus communis': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta es muy venenosa: una sola semilla (ricina) puede matar a un niño. Las hojas lo son menos. El aceite no contiene la toxina.'
  },
  'robinia pseudoacacia': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta salvo las flores, y sobre todo la corteza, es tóxica. El calor destruye las toxinas.'
  },
  'rosa canina': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos que rodean las semillas dentro del escaramujo irritan la boca y el intestino: quitarlos antes de comer el fruto.'
  },
  'rosa gallica': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos que rodean las semillas dentro del escaramujo irritan la boca y el intestino: quitarlos antes de comer el fruto.'
  },
  'rosa glauca': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos que rodean las semillas dentro del escaramujo irritan la boca y el intestino: quitarlos antes de comer el fruto.'
  },
  'rosa multiflora': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos que rodean las semillas dentro del escaramujo irritan la boca y el intestino: quitarlos antes de comer el fruto.'
  },
  'rosa rugosa': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos que rodean las semillas dentro del escaramujo irritan la boca y el intestino: quitarlos antes de comer el fruto.'
  },
  'rosa × damascena': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos que rodean las semillas dentro del escaramujo irritan la boca y el intestino: quitarlos antes de comer el fruto.'
  },
  'rosmarinus officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los productos con aceite de romero pueden enrojecer la piel. En grandes cantidades se ha usado como abortivo, con riesgo de coma, espasmos y muerte: solo en dosis culinarias.'
  },
  'rubus idaeus': { edible: true, toxic: false },
  'rubus occidentalis': { edible: true, toxic: false },
  'rubus ulmifolius': { edible: true, toxic: false },
  'rudbeckia hirta': {
    edible: false,
    toxic: true,
    toxicityNotes: 'Se considera venenosa para vacas, ovejas y cerdos.'
  },
  'ruta graveolens': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Toda la planta es venenosa en grandes cantidades y puede causar abortos. Su savia provoca fotosensibilidad, ampollas y dermatitis: manipular con guantes.'
  },
  'saccharum officinarum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Hojas y vainas de algunas variedades tienen pelos silíceos que se clavan en la piel: manipular con cuidado.'
  },
  'salicornia europaea': { edible: true, toxic: false },
  'salix alba': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal (salicilatos, como la aspirina) puede causar hemorragia digestiva y daño renal: evitar con otros salicilatos y en el embarazo.'
  },
  'salix babylonica': { edible: true, toxic: false },
  'salix caprea': { edible: true, toxic: false },
  'salix daphnoides': { edible: true, toxic: false },
  'salix exigua': { edible: true, toxic: false },
  'salix fragilis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal (salicilatos, como la aspirina) puede causar hemorragia digestiva y daño renal: evitar con otros salicilatos y en el embarazo.'
  },
  'salix lucida': { edible: false, toxic: false },
  'salix nigra': { edible: true, toxic: false },
  'salix pentandra': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal (salicilatos, como la aspirina) puede causar hemorragia digestiva y daño renal: evitar con otros salicilatos y en el embarazo.'
  },
  'salix purpurea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal (salicilatos, como la aspirina) puede causar hemorragia digestiva y daño renal: evitar con otros salicilatos y en el embarazo.'
  },
  'salix repens': { edible: true, toxic: false },
  'salix scouleriana': { edible: false, toxic: false },
  'salix sitchensis': { edible: true, toxic: false },
  'salix viminalis': { edible: true, toxic: false },
  'salvia apiana': { edible: true, toxic: false },
  'salvia elegans': { edible: true, toxic: false },
  'salvia glutinosa': { edible: true, toxic: false },
  'salvia hispanica': { edible: true, toxic: false },
  'salvia lavandulifolia': { edible: true, toxic: false },
  'salvia leucantha': { edible: false, toxic: false },
  'salvia microphylla': { edible: true, toxic: false },
  'salvia officinalis': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Tóxica en exceso o en tomas prolongadas: inquietud, vómitos, vértigo, temblores y convulsiones. Evitar en el embarazo y con tendencia a convulsiones. Uso culinario seguro.'
  },
  'salvia pratensis': { edible: true, toxic: false },
  'salvia sclarea': { edible: true, toxic: false },
  'salvia verbenaca': { edible: true, toxic: false },
  'salvia viridis': { edible: true, toxic: false },
  'sambucus ebulus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas y tallos de este género son venenosos, y el fruto ha causado molestias digestivas. Cocinarlo destruye su posible toxina.'
  },
  'sambucus nigra': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas y tallos son venenosos. El fruto crudo puede sentar mal; su posible toxina es muy débil y se destruye al cocinarlo.'
  },
  'samolus valerandi': { edible: true, toxic: false },
  'sanguinaria canadensis': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Contiene muchos alcaloides y es venenosa en dosis altas. La savia irrita mucho las mucosas. No usar en el embarazo ni la lactancia.'
  },
  'sanguisorba officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Mejor evitarla en el embarazo por falta de datos; puede interaccionar con antibióticos fluoroquinolonas.'
  },
  'sansevieria trifasciata': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Contiene glucósidos y saponinas y es muy tóxica. Mantener lejos de niños y mascotas.'
  },
  'santolina chamaecyparissus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las hojas machacadas pueden causar un sarpullido fuerte en pieles sensibles.'
  },
  'sapium sebiferum': {
    edible: true,
    toxic: true,
    toxicityNotes: 'La savia es venenosa.'
  },
  'saponaria officinalis': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Rica en saponinas, tóxicas aunque se absorben poco; la cocción las destruye. No es comestible.'
  },
  'sassafras albidum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'El aceite esencial es venenoso en grandes cantidades: contiene safrol, cancerígeno y dañino para el hígado, prohibido como aromatizante en EE. UU.'
  },
  'satureja hortensis': { edible: true, toxic: false },
  'satureja montana': { edible: true, toxic: false },
  'schoenoplectus californicus': { edible: true, toxic: false },
  'scolymus hispanicus': { edible: true, toxic: false },
  'scoparia dulcis': { edible: true, toxic: false },
  'scorzonera hispanica': { edible: true, toxic: false },
  'scutellaria baicalensis': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Puede ser tóxica para el hígado. Efectos en el embarazo desconocidos.'
  },
  'scutellaria lateriflora': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Una sobredosis de tintura causa vértigo, confusión y convulsiones; posible toxicidad hepática. Evitar en el embarazo.'
  },
  'secale cereale': { edible: true, toxic: false },
  'sechium edule': { edible: true, toxic: false },
  'sedum acre': {
    edible: true,
    toxicityNotes:
      'Dudosamente venenosa: la savia irrita la piel de algunas personas y las hojas en cantidad pueden sentar mal.'
  },
  'sedum kamtschaticum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'No es venenosa, pero en grandes cantidades puede sentar mal al estómago.'
  },
  'sedum makinoi': { edible: true, toxic: false },
  'sedum reflexum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'No es venenosa, pero en grandes cantidades puede sentar mal al estómago.'
  },
  'sempervivum tectorum': { edible: true, toxic: false },
  'senna alata': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Se considera venenosa, sobre todo para las cabras; la corteza se usa como veneno para peces.'
  },
  'sesbania grandiflora': { edible: true, toxic: false },
  'sesbania sesban': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas frescas son venenosas; se comen tras remojarlas 3 días y cocinarlas.'
  },
  'setaria italica': { edible: true, toxic: false },
  'silene acaulis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene saponinas, que se absorben poco y la cocción destruye. No comer grandes cantidades.'
  },
  'silene vulgaris': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Contiene saponinas, que se absorben poco y la cocción destruye. No comer grandes cantidades.'
  },
  'sisyrinchium angustifolium': { edible: true, toxic: false },
  'skimmia japonica': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta contiene un alcaloide venenoso, la esquimianina.'
  },
  'solanum aethiopicum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas, tallos, frutos y tubérculos verdes o germinados contienen solanina, como otras solanáceas del género. El tubérculo maduro, sin partes verdes y cocinado, es seguro.'
  },
  'solanum dulcamara': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'Toda la planta, incluidos los frutos, es venenosa, aunque de forma leve: náuseas, vómitos, diarrea y pupilas dilatadas. En sobredosis puede ser mortal.'
  },
  'solanum lycopersicum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Todas las partes verdes (hojas, tallos, frutos verdes) son venenosas por sus alcaloides. El fruto maduro se come.'
  },
  'solanum melongena': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Todas las partes verdes son venenosas. El fruto se come cocinado.'
  },
  'solanum muricatum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas, tallos, frutos y tubérculos verdes o germinados contienen solanina, como otras solanáceas del género. El tubérculo maduro, sin partes verdes y cocinado, es seguro.'
  },
  'solanum nigrum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hay mucho desacuerdo: según la zona y el cultivar, hojas y frutos van de bastante venenosos a comestibles. Las bayas verdes son las más peligrosas; en algunas regiones se cultiva como alimento.'
  },
  'solanum quitoense': {
    edible: true,
    toxicityNotes:
      'Los frutos tienen pelos urticantes que se quitan fácilmente. Como otras solanáceas, sus partes no comestibles pueden tener alcaloides venenosos. El fruto maduro se come.'
  },
  'solanum retroflexum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas, tallos, frutos y tubérculos verdes o germinados contienen solanina, como otras solanáceas del género. El tubérculo maduro, sin partes verdes y cocinado, es seguro.'
  },
  'solanum sisymbriifolium': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas, tallos, frutos y tubérculos verdes o germinados contienen solanina, como otras solanáceas del género. El tubérculo maduro, sin partes verdes y cocinado, es seguro.'
  },
  'solanum tuberosum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Hojas, tallos, frutos y tubérculos verdes o germinados contienen solanina, como otras solanáceas del género. El tubérculo maduro, sin partes verdes y cocinado, es seguro.'
  },
  'soldanella alpina': { edible: false, toxic: false },
  'sorghum bicolor': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La planta joven es venenosa, sobre todo algo marchita, por el cianuro de hidrógeno y la hordenina; el secado o el ensilado los destruyen. El grano se come.'
  },
  'spartina pectinata': { edible: false, toxic: false },
  'spinacia oleracea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Rica en ácido oxálico, que reduce la absorción del calcio; solo es un problema si se come mucha. Evitar con cálculos renales o gota. Cocinarla lo reduce.'
  },
  'sporobolus airoides': { edible: true, toxic: false },
  'sporobolus wrightii': { edible: true, toxic: false },
  'stachys germanica': { edible: false, toxic: false },
  'stachys officinalis': { edible: true, toxic: false },
  'stachys palustris': {
    edible: true,
    toxic: false,
    toxicityNotes: 'Evitar en el embarazo y la lactancia.'
  },
  'stachys sylvatica': { edible: false, toxic: false },
  'stellaria media': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Las hojas tienen saponinas, que se absorben poco y la cocción destruye. No conviene comer grandes cantidades.'
  },
  'stenotaphrum secundatum': { edible: false, toxic: false },
  'stevia rebaudiana': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede causar mareo, dolor de cabeza, gases y náuseas. Precaución en diabéticos y con medicación para la tensión.'
  },
  'stewartia pseudocamellia': { edible: true, toxic: false },
  'stillingia sylvatica': {
    edible: false,
    toxic: true,
    toxicityNotes:
      'El látex causa ampollas en la piel, y en dosis altas la planta es tóxica.'
  },
  'styphnolobium japonicum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Contiene citisina, parecida a la nicotina y tóxica como ella.'
  },
  'syringa josikaea': { edible: false, toxic: false },
  'syringa vulgaris': { edible: true, toxic: false },
  'syzygium aromaticum': { edible: true, toxic: false },
  'syzygium cumini': { edible: true, toxic: false },
  'syzygium jambos': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las semillas se consideran venenosas, y raíces, tallos y hojas contienen ácido cianhídrico y el alcaloide jambosina. El fruto se come.'
  },
  'tagetes erecta': { edible: true, toxic: false },
  'tagetes minuta': {
    edible: true,
    toxic: false,
    toxicityNotes: 'Su savia puede causar dermatitis en personas sensibles.'
  },
  'tamarindus indica': { edible: true, toxic: false },
  'tanacetum parthenium': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'No usar en el embarazo ni con problemas de coagulación. Puede causar llagas en la boca y molestias digestivas; al dejarla, dolores de cabeza de rebote.'
  },
  'tanacetum vulgare': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Venenosa en grandes cantidades: infusiones fuertes usadas como abortivo han causado muertes.'
  },
  'taraxacum officinale': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Aparece en libros de plantas venenosas, pero sus posibles toxinas son de muy baja concentración. El látex de hojas y tallos puede causar dermatitis.'
  },
  'tectona grandis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El polvo de su madera puede irritar la piel y causar asma o rinitis.'
  },
  'tetragonia tetragonioides': { edible: true, toxic: false },
  'teucrium chamaedrys': { edible: true, toxic: false },
  'teucrium polium': { edible: true, toxic: false },
  'teucrium scorodonia': { edible: true, toxic: false },
  'thalictrum aquilegiifolium': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Toda la planta es venenosa, sobre todo la raíz.'
  },
  'thymus herba-barona': { edible: true, toxic: false },
  'thymus praecox': { edible: true, toxic: false },
  'thymus pulegioides': { edible: true, toxic: false },
  'thymus serpyllum': { edible: true, toxic: false },
  'thymus vulgaris': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Como todos los aceites esenciales, el de tomillo es dañino en dosis altas. Evitar en uso interno con inflamación digestiva y en el embarazo. Uso culinario seguro.'
  },
  'tigridia pavonia': { edible: true, toxic: false },
  'trachelospermum jasminoides': { edible: false, toxic: false },
  'tragopogon porrifolius': { edible: true, toxic: false },
  'trichosanthes cucumerina': { edible: true, toxic: false },
  'trifolium incarnatum': { edible: true, toxic: false },
  'trifolium pratense': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El trébol enfermo, aunque no lo parezca, puede contener alcaloides tóxicos.'
  },
  'trifolium repens': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Algunas plantas contienen glucósidos cianogénicos en hojas y flores, que han causado problemas al ganado en ciertos climas.'
  },
  'trigonella foenum-graecum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La semilla tiene saponinas, que se absorben poco y se eliminan lavando la semilla o con buena cocción. No conviene comer grandes cantidades.'
  },
  'triteleia laxa': { edible: true, toxic: false },
  'triticum aestivum': { edible: true, toxic: false },
  'triticum turgidum': { edible: true, toxic: false },
  'tritonia crocata': { edible: true, toxic: false },
  'tropaeolum majus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Puede irritar la mucosa digestiva: evitar en bebés, niños pequeños y con úlceras o enfermedad renal. Hojas y flores se comen con moderación.'
  },
  'tropaeolum minus': { edible: true, toxic: false },
  'tropaeolum tricolor': { edible: true, toxic: false },
  'tropaeolum tuberosum': { edible: true, toxic: false },
  'ugni molinae': { edible: true, toxic: false },
  'ulex europaeus': { edible: true, toxic: false },
  'umbellularia californica': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El follaje puede irritar la piel, y el aceite de las hojas, inhalado, causa estornudos y dolor de cabeza.'
  },
  'urtica dioica': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos urticantes irritan la piel; el calor o el secado los neutralizan, y cocinada es segura. Usar solo hojas jóvenes: las viejas tienen cistolitos que irritan los riñones.'
  },
  'urtica urens': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los pelos urticantes irritan la piel; el calor los neutraliza y cocinada es segura. Usar solo hojas jóvenes: las viejas tienen cistolitos que irritan los riñones.'
  },
  'vaccinium angustifolium': { edible: true, toxic: false },
  'vaccinium arboreum': { edible: true, toxic: false },
  'vaccinium corymbosum': { edible: true, toxic: false },
  'vaccinium darrowii': { edible: true, toxic: false },
  'vaccinium macrocarpon': { edible: true, toxic: false },
  'vaccinium myrsinites': { edible: true, toxic: false },
  'vaccinium myrtillus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Los taninos pueden causar trastornos digestivos en tomas prolongadas o altas. Evitar en el embarazo y con anticoagulantes en dosis medicinales. El fruto se come.'
  },
  'vaccinium oxycoccos': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En grandes cantidades causa diarrea y molestias digestivas. Consultar si hay enfermedad renal.'
  },
  'vaccinium stamineum': { edible: true, toxic: false },
  'vaccinium vitis-idaea': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'La infusión de hojas no debe tomarse a diario por su arbutina. Los frutos se comen.'
  },
  'verbascum thapsus': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las hojas contienen rotenona (insecticida) y cumarina (anticoagulante), en cantidad desconocida. Sus pelos irritan.'
  },
  'verbena hastata': { edible: true, toxic: false },
  'verbena officinalis': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En dosis altas puede causar estupor y convulsiones. Evitar en el embarazo, la lactancia y con medicación para la tensión.'
  },
  'verbena stricta': { edible: true, toxic: false },
  'vernicia fordii': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'El aceite de la semilla es venenoso, y hojas y semillas contienen una saponina tóxica.'
  },
  'veronica anagallis-aquatica': { edible: true, toxic: false },
  'veronica arvensis': { edible: false, toxic: false },
  'veronica beccabunga': { edible: true, toxic: false },
  'veronica chamaedrys': { edible: true, toxic: false },
  'veronica hederifolia': { edible: false, toxic: false },
  'veronica officinalis': { edible: true, toxic: false },
  'veronica peregrina': { edible: false, toxic: false },
  'veronica salicifolia': { edible: false, toxic: false },
  'veronica speciosa': { edible: false, toxic: false },
  'veronicastrum sibiricum': { edible: false, toxic: false },
  'vetiveria zizanioides': { edible: true, toxic: false },
  'viburnum opulus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'El fruto es de toxicidad muy baja o nula: solo causa vómitos y diarrea verde o en grandes cantidades. Mejor cocinado.'
  },
  'viburnum tinus': { edible: false, toxic: false },
  'vicia faba': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En personas con predisposición genética (déficit de G6PD), comer muchas habas puede causar favismo, una anemia grave.'
  },
  'vicia sativa': {
    edible: true,
    toxicityNotes:
      'Hay indicios de laboratorio de que la semilla podría ser tóxica, pero no hay casos de intoxicación registrados.'
  },
  'vicia villosa': {
    edible: true,
    toxicityNotes:
      'Hay indicios de laboratorio de que la semilla podría ser tóxica, pero no hay casos de intoxicación registrados.'
  },
  'vigna angularis': { edible: true, toxic: false },
  'vigna radiata': { edible: true, toxic: false },
  'vigna unguiculata': { edible: true, toxic: false },
  'viola cornuta': { edible: true, toxic: false },
  'viola odorata': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En dosis medicinales puede causar vómitos y potenciar los laxantes. Las flores se comen.'
  },
  'viola palmata': { edible: false, toxic: false },
  'viola palustris': { edible: true, toxic: false },
  'viola pedata': { edible: true, toxic: false },
  'viola riviniana': { edible: true, toxic: false },
  'viola sororia': { edible: true, toxic: false },
  'viola tricolor': { edible: true, toxic: false },
  'viola × wittrockiana': { edible: true, toxic: false },
  'vitex agnus-castus': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'En uso medicinal puede causar dolor de cabeza, calambres abdominales, diarrea y erupciones.'
  },
  'vitex negundo': { edible: true, toxic: false },
  'vitis amurensis': { edible: true, toxic: false },
  'vitis coignetiae': { edible: true, toxic: false },
  'vitis labrusca': { edible: true, toxic: false },
  'vitis rotundifolia': { edible: true, toxic: false },
  'vitis vinifera': { edible: true, toxic: false },
  'vitis vulpina': { edible: true, toxic: false },
  'wasabia japonica': { edible: true, toxic: false },
  'wisteria floribunda': {
    edible: true,
    toxic: true,
    toxicityNotes: 'Las semillas son venenosas, como en todo el género.'
  },
  'wisteria sinensis': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Semillas, vainas y corteza son venenosas (wisterina); han intoxicado a niños con gastroenteritis leve a grave.'
  },
  'yucca aloifolia': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las raíces contienen saponinas, tóxicas aunque se absorben poco; un horneado lento y prolongado las destruye. Son muy tóxicas para los peces.'
  },
  'yucca filamentosa': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las raíces contienen saponinas, tóxicas aunque se absorben poco; un horneado lento y prolongado las destruye. Son muy tóxicas para los peces.'
  },
  'yucca gloriosa': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Las raíces contienen saponinas, tóxicas aunque se absorben poco; un horneado lento y prolongado las destruye. Son muy tóxicas para los peces.'
  },
  'zantedeschia aethiopica': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'Cruda contiene probablemente cristales de oxalato cálcico, venenosos y muy irritantes para la boca, como su familia. Mantener lejos de niños y mascotas.'
  },
  'zanthoxylum americanum': {
    edible: true,
    toxic: false,
    toxicityNotes:
      'Sus taninos pueden reducir la absorción de hierro; en exceso estimula el sistema nervioso e interfiere con anticoagulantes.'
  },
  'zanthoxylum bungeanum': {
    edible: true,
    toxic: true,
    toxicityNotes:
      'La planta es tóxica (sin más detalle). Los frutos se usan como especia.'
  },
  'zanthoxylum piperitum': { edible: true, toxic: false },
  'zea mays': { edible: true, toxic: false },
  'zingiber officinale': { edible: true, toxic: false },
  'zoysia japonica': { edible: true, toxic: false }
};

export class PlantsChangedWhileMigratingError extends Error {
  constructor(count) {
    super(`${count} plant(s) changed while migrating: run the migration again`);
    this.name = 'PlantsChangedWhileMigratingError';
    this.count = count;
  }
}

const traitsFor = (plant) => {
  const name = plant.identity?.scientificName;
  if (typeof name !== 'string') return undefined;

  return Object.hasOwn(ECOLOGICAL_TRAITS, name.trim().toLowerCase())
    ? ECOLOGICAL_TRAITS[name.trim().toLowerCase()]
    : undefined;
};

const sameTraits = (stored, expected) =>
  stored !== null &&
  typeof stored === 'object' &&
  Object.keys(stored).length === Object.keys(expected).length &&
  Object.entries(expected).every(([key, value]) => stored[key] === value);

const fillChange = (plant) => {
  const traits = traitsFor(plant);
  if (traits === undefined || plant.traits?.ecological !== undefined) {
    return undefined;
  }
  return { $set: { 'traits.ecological': traits } };
};

// Only the values this migration wrote are removed: a plant edited since
// keeps its own.
const rollbackChange = (plant) => {
  const traits = traitsFor(plant);
  if (traits === undefined || !sameTraits(plant.traits?.ecological, traits)) {
    return undefined;
  }
  return { $unset: { 'traits.ecological': '' } };
};

const updateEach = async (collection, changeOf, at = new Date()) => {
  let operations = [];
  let totalOperations = 0;
  let matched = 0;

  const flush = async () => {
    if (operations.length === 0) return;
    const result = await collection.bulkWrite(operations);
    matched += result.matchedCount;
    operations = [];
  };

  for await (const plant of collection.find({})) {
    const change = changeOf(plant);
    if (change === undefined) continue;
    operations.push({
      updateOne: {
        // The version read: a plant changed meanwhile is not overwritten.
        filter: { _id: plant._id, version: plant.version },
        update: {
          ...change,
          $set: {
            ...change.$set,
            'metadata.updatedAt': at,
            'metadata.updatedBy': MIGRATION_USER
          },
          $inc: { version: 1 }
        }
      }
    });
    totalOperations += 1;

    if (operations.length === BATCH_SIZE) {
      await flush();
    }
  }

  await flush();

  if (matched !== totalOperations) {
    throw new PlantsChangedWhileMigratingError(totalOperations - matched);
  }
};

export const up = async (db) => {
  await updateEach(db.collection('plants'), fillChange);
};

export const down = async (db) => {
  await updateEach(db.collection('plants'), rollbackChange);
};
