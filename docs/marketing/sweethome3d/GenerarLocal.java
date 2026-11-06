import com.eteks.sweethome3d.io.DefaultUserPreferences;
import com.eteks.sweethome3d.io.HomeFileRecorder;
import com.eteks.sweethome3d.j3d.PhotoRenderer;
import com.eteks.sweethome3d.model.*;
import com.eteks.sweethome3d.swing.PlanComponent;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.Locale;

// Genera el local de PokeCard (10 x 8 m) en Sweet Home 3D, siguiendo docs/marketing/plano_local.svg
public class GenerarLocal {
  static final int MORADO_OSCURO = 0x1A0F2E, MORADO = 0x7B5CB0, ROJO = 0xE22B3F,
      LAVANDA = 0x9B8FC0, BLANCO = 0xF5F2FA, NEGRO = 0x0A0A0A, BORDE = 0x3D2F5C;

  static UserPreferences prefs;
  static Home home;

  public static void main(String[] args) throws Exception {
    Locale.setDefault(Locale.US); // nombres del catálogo en inglés para buscarlos
    String salida = args[0];
    prefs = new DefaultUserPreferences();
    prefs.setUnit(LengthUnit.CENTIMETER);
    home = new Home(250f);
    home.setName("Local PokeCard");

    // Paredes exteriores (20 cm) y del depósito (12 cm)
    pared(0, 0, 1000, 0, 20, MORADO_OSCURO);
    pared(1000, 0, 1000, 800, 20, MORADO_OSCURO);
    pared(1000, 800, 0, 800, 20, MORADO_OSCURO);
    pared(0, 800, 0, 0, 20, MORADO_OSCURO);
    pared(700, 0, 700, 300, 12, LAVANDA);
    pared(700, 300, 1000, 300, 12, LAVANDA);

    // Pisos
    habitacion("Salón", new float[][] {{0, 0}, {700, 0}, {700, 300}, {1000, 300}, {1000, 800}, {0, 800}}, 0xC9BFE0);
    habitacion("Depósito", new float[][] {{700, 0}, {1000, 0}, {1000, 300}, {700, 300}}, 0xD9D4E4);

    // Entrada, vidrieras y puerta del depósito
    abertura("Front door", "Puerta de entrada", 450, 800, 100, 0);
    abertura("Fixed window", "Vidriera", 220, 800, 280, 0);
    abertura("Fixed window", "Vidriera", 780, 800, 280, 0);
    abertura("Door", "Puerta del depósito", 700, 250, 80, (float) Math.PI / 2);

    // Exhibidores contra la pared izquierda
    mueble("Glass door cabinet", "Exhibidor de cartas sueltas", 50, 160, 240, 50, 200, 90, MORADO);
    mueble("Bookcase", "Exhibidor de sobres", 50, 420, 200, 50, 180, 90, MORADO);
    mueble("Bookcase", "Exhibidor de mazos", 50, 640, 160, 50, 180, 90, MORADO);
    // Vitrina con llave (cartas de alto valor)
    mueble("Glass door cabinet", "Vitrina con llave", 420, 130, 320, 80, 110, 0, MORADO_OSCURO);
    // Mesa de juego con 6 sillas
    mueble("Table", "Mesa de juego", 420, 420, 280, 160, 75, 0, LAVANDA);
    for (int i = 0; i < 3; i++) {
      float x = 330 + i * 90;
      mueble("Chair", "Silla", x, 315, 45, 50, 90, 180, NEGRO);
      mueble("Chair", "Silla", x, 525, 45, 50, 90, 0, NEGRO);
    }
    // Accesorios (pared derecha)
    mueble("Bookcase", "Exhibidor de accesorios", 950, 470, 220, 50, 180, -90, MORADO);
    // Mostrador en L con la caja
    mueble("Box", "Mostrador", 780, 650, 240, 60, 100, 0, ROJO);
    mueble("Box", "Mostrador", 870, 710, 60, 60, 100, 0, ROJO);
    mueble("Laptop", "Caja (computadora)", 760, 650, 35, 25, 2, 180, -1);
    // Depósito
    mueble("Bookcase", "Estantería del depósito", 850, 40, 260, 50, 200, 0, BORDE);
    mueble("Box", "Cajas de stock", 960, 200, 60, 60, 60, 0, 0xB08D57);
    mueble("Box", "Cajas de stock", 890, 230, 60, 60, 60, 0, 0xB08D57);
    // Detalles
    mueble("Plant", "Planta", 60, 760, 50, 50, 120, 0, -1);
    mueble("Plant", "Planta", 940, 760, 50, 50, 120, 0, -1);

    // Luces de techo para el render
    for (float[] p : new float[][] {{250, 250}, {250, 600}, {550, 600}, {550, 250}, {850, 150}, {850, 550}}) {
      CatalogPieceOfFurniture luz = buscar("White light source");
      HomeLight l = new HomeLight((CatalogLight) luz);
      l.setX(p[0]); l.setY(p[1]); l.setElevation(240); l.setPower(0.25f);
      home.addPieceOfFurniture(l);
    }

    // Carteles de los sectores y QR (mismos números que en el plano y en docs 10.13)
    etiqueta("QR 1 · Entrada", 450, 760);
    etiqueta("QR 2 · Cartas sueltas", 160, 160);
    etiqueta("QR 3 · Sobres", 140, 420);
    etiqueta("QR 4 · Mazos", 140, 640);
    etiqueta("QR 5 · Accesorios", 840, 470);
    etiqueta("QR 6 · Caja", 700, 720);
    etiqueta("Vitrina con llave", 420, 205);
    etiqueta("Mesa de juego", 420, 595);

    // Guardar
    new HomeFileRecorder(9, false, prefs, false, true).writeHome(home, salida + "/local_pokecard.sh3d");

    // Plano 2D
    PlanComponent plano = new PlanComponent(home, prefs, null);
    plano.setScale(0.9f);
    Dimension d = plano.getPreferredSize();
    plano.setSize(d);
    BufferedImage img2d = new BufferedImage(d.width, d.height, BufferedImage.TYPE_INT_RGB);
    plano.paint(img2d.createGraphics()); // primera pasada: dispara la carga de los íconos
    Thread.sleep(8000);
    Graphics2D g = img2d.createGraphics();
    g.setColor(Color.WHITE); g.fillRect(0, 0, d.width, d.height);
    plano.paint(g);
    g.dispose();
    ImageIO.write(img2d, "png", new File(salida + "/local_2d.png"));

    System.out.println("ok");
    System.exit(0);
  }

  static void render(Camera camara, String archivo) throws Exception {
    BufferedImage img = new BufferedImage(1200, 750, BufferedImage.TYPE_INT_RGB);
    PhotoRenderer r = new PhotoRenderer(home, PhotoRenderer.Quality.HIGH);
    r.render(img, camara, null);
    r.dispose();
    ImageIO.write(img, "png", new File(archivo));
  }

  static CatalogPieceOfFurniture buscar(String nombre) {
    for (FurnitureCategory c : prefs.getFurnitureCatalog().getCategories())
      for (CatalogPieceOfFurniture p : c.getFurniture())
        if (p.getName().equals(nombre)) return p;
    throw new IllegalArgumentException("No está en el catálogo: " + nombre);
  }

  static void pared(float x1, float y1, float x2, float y2, float grosor, int color) {
    Wall w = new Wall(x1, y1, x2, y2, grosor, 250f);
    w.setLeftSideColor(color);
    w.setRightSideColor(color);
    // Unir con la pared anterior si comparten extremo
    for (Wall otra : home.getWalls()) {
      if (otra.getXEnd() == x1 && otra.getYEnd() == y1 && otra.getWallAtEnd() == null) {
        otra.setWallAtEnd(w); w.setWallAtStart(otra);
      }
      if (otra.getXStart() == x2 && otra.getYStart() == y2 && otra.getWallAtStart() == null) {
        otra.setWallAtStart(w); w.setWallAtEnd(otra);
      }
    }
    home.addWall(w);
  }

  static void habitacion(String nombre, float[][] puntos, int colorPiso) {
    Room r = new Room(puntos);
    r.setName(nombre);
    r.setFloorColor(colorPiso);
    r.setCeilingColor(BLANCO);
    r.setAreaVisible(true);
    home.addRoom(r);
  }

  static void abertura(String catalogo, String nombre, float x, float y, float ancho, float angulo) {
    HomeDoorOrWindow p = new HomeDoorOrWindow((DoorOrWindow) buscar(catalogo));
    p.setName(nombre);
    p.setWidth(ancho);
    p.setX(x); p.setY(y);
    p.setAngle(angulo);
    p.setBoundToWall(true);
    home.addPieceOfFurniture(p);
  }

  static void mueble(String catalogo, String nombre, float x, float y, float ancho, float prof, float alto,
                     float grados, int color) {
    HomePieceOfFurniture p = new HomePieceOfFurniture(buscar(catalogo));
    p.setName(nombre);
    p.setWidth(ancho); p.setDepth(prof); p.setHeight(alto);
    p.setX(x); p.setY(y);
    p.setAngle((float) Math.toRadians(grados));
    if (color >= 0) p.setColor(color);
    home.addPieceOfFurniture(p);
  }

  static void etiqueta(String texto, float x, float y) {
    com.eteks.sweethome3d.model.Label l = new com.eteks.sweethome3d.model.Label(texto, x, y);
    l.setStyle(new TextStyle(18));
    home.addLabel(l);
  }
}
