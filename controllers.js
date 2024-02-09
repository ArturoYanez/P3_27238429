// -*- coding: utf-8 -*-
//Librerias y dependencias
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
var handlebars = require('express-handlebars')
const Recaptcha = require('express-recaptcha').RecaptchaV2;
const recaptcha = new Recaptcha('6LcoNy0pAAAAANL1RlKBWgjSPc2mn7qI5Gf59Xo3', '6LcoNy0pAAAAAFtE0DGF2NzXuf9oqN8AmVVYCpWQ');
const multer = require('multer');
const http = require('http');
const express = require('express');
const app = express();

//Configuracion socket.io para las notificaciones realTime

const server = http.createServer(app);

const {Server} = require('socket.io');

const io = new Server(server);

io.on('connection', (socket) => {

console.log('Un usuario se a conectado');

socket.emit('mensajeServer', '¡Hola, cliente!');

socket.on('disconnect',()=>{

console.log('un usuario se a desconectado');

});

});

//recursos que se van a cargar en el server 
app.use(express.static(__dirname+'/static'));

//Configuración de las plantillas
app.set('view engine','ejs');//definimos el motor de plantilla con archivos ejs
app.set('views',path.join(__dirname,"./views"));//definimos la ruta del motor de plantilla

app.use(express.urlencoded({extended:false}));//permite recuperar los valores publicados en un request

app.use(cookieParser());
app.use(express.json());
const jwt = require('jsonwebtoken');
const bodyParser= require('body-parser');
//app.use(bodyParser.urlencoded({extended: true}));

const baseDatos = require('./models/baseDatos.js');
const utils = require('./middleware/uploadImg.js');
//middleware para verificar cliente
const {verifyToken} = require('./middleware/JWT.js');
//middleware para verificar admin
const {verifyToken2} = require('./middleware/JWT2.js');
//Variables de entorno
const {contrasena,admin,port,secretKey2} = process.env;
let ext;

//---------------------------------------------------------------

//--------------------------------------------------------------
let storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, './static/uploads')
  },
  filename: function (req, file, cb) {
    ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + utils.getContentType(ext))
  }
});

let upload = multer({ storage: storage });

//-----------------------------------------------------------------

//-----------------------------------------------------------
//enruptamiento
app.get('/',(req,res)=>{
  res.clearCookie('transaccion');
  res.render('index.ejs')
});

app.get('/login',(req,res)=>{
res.render('iniciarSesion.ejs',{
   og: {
      title: 'Smarphone Solution',
      description: 'Venta de Productos Telefonicos',
      image: 'https://www.pexels.com/es-es/foto/persona-sosteniendo-un-smartphone-android-samsung-blanco-6347724/',
      // Otros metadatos OGP que desees especificar
      }
});
});


app.post('/login',(req,res)=>{

 const {admin,password} = req.body;

 const dato= {
  admin,
  password
 }

   if(admin === admin && password === contrasena){
    const token = jwt.sign(dato,secretKey2,{expiresIn:60 * 60 * 24});
   // Guardar token en cookies
    res.cookie('token2', token, { httpOnly: true, secure: true });
    res.redirect('/productos');
   }else{
   res.json({INCORRECT:'Contraseña o usuario Incorrecto'});
   }

});
  

app.get('/add',verifyToken2,(req,res)=>{
res.render('add.ejs');
});

//---------------------------------------------------------
app.get('/addImagen/:id',verifyToken2,(req,res)=>{
baseDatos.getImagen(req,res);
});


app.post('/addImagen/:id',upload.single('img'),(req,res)=>{ 
baseDatos.aggIMG(req,res);
});


app.post('/addPost',(req,res)=>{   
baseDatos.aggDato(req,res);
});


app.get('/productos',verifyToken2,(req,res)=>{
  baseDatos.mostrarProductos(req,res);
});
//-------------------------------------------------------
// GET /editar/:id
app.get('/update/:id',verifyToken2,(req, res) => {
baseDatos.mostrarUpdate(req,res);

});
//-------------------------------------------------------
// POST /editar/:id
app.post('/update/:id', (req, res) => {
 baseDatos.update(req,res);
});
//-------------------------------------------------------
// GET /eliminar/:id
app.get('/delete/:id',verifyToken2,(req, res) => {
 baseDatos.mostrarDelete(req,res);
});
//-------------------------------------------------------
// POST /eliminar/:id
app.post('/delete/:id',(req, res) => {
 baseDatos.deletee(req,res);
});
//------------------------------------------------------
app.get('/categorias',verifyToken2,(req, res) => {
 baseDatos.getCategorias(req,res);
});
//-------------------------------------------------------
app.get('/addCategorias',verifyToken2,(req, res) => {
 res.render('addcategoria.ejs');
});
//-------------------------------------------------------
app.post('/addcategorias', (req, res) => {
 baseDatos.postCategorias(req,res);
});
//-------------------------------------------------------
app.get('/updateCategoria/:id',verifyToken2,(req,res)=>{
 baseDatos.mostrarUpdateC(req,res);
});
//-------------------------------------------------------
app.post('/updateCategoria/:id',(req,res)=>{
baseDatos.updateCateg(req,res);
});
//-------------------------------------------------------
app.get('/eliminarCategoria/:id',verifyToken2,(req,res)=>{
baseDatos.deleteCategoriaGET(req,res);
});
//-------------------------------------------------------
app.get('/clientes',verifyToken,(req,res)=>{
console.log('mostrando plantilla clientes.ejs!');
baseDatos.ClientesGET(req,res);

});
//--------------------------------------------------
app.get('/cliente',(req, res) => {
 baseDatos.filtrar(req,res);
});
//-------------------------------------------------------
app.get('/detalles/:id',verifyToken,(req,res)=>{
res.clearCookie('transaccion');
baseDatos.detalles(req,res);
});
//-------------------------------------------------------
app.get('/loginUsers',(req,res)=>{
baseDatos.loginUsers(req,res);
});
//------------------------------------------------------
app.post('/loginUsers',(req,res)=>{
  baseDatos.postLoginCliente(req,res);
})
//------------------------------------------------------
app.get('/registroUsers',(req,res)=>{
  baseDatos.registroUsers(req,res);
});
//------------------------------------------------------
app.post('/registroUsuariosPost',recaptcha.middleware.verify,(req,res)=>{


   if(!req.recaptcha.error){
    // El reCAPTCHA se ha verificado correctamente
     baseDatos.registroUsuariosPost(req,res); 
  } else{
    // El reCAPTCHA no se ha verificado correctamente
    res.send('Error en el reCAPTCHA');
  } 
})
//------------------------------------------------------
app.get('/comprar/:id',verifyToken,(req,res)=>{
  res.clearCookie('transaccion');
  baseDatos.comprar(req,res);
});
//------------------------------------------------------
app.post('/comprarPost',async (req,res)=>{
baseDatos.comprarPOST(req,res);
})
//////////////////////////////////////////////////////
app.get('puntosDebusqueda',(req,res)=>{

  const id = req.query.idProducto;
  const sql =`SELECT * FROM puntuaciones WHERE producto_id = ?`;
  db.get(sql,[id],(e,d)=>{
    console.log(d,'puntuaciones de busqueda');
  if(e){
    res.json({error:true})
  }else{
    res.json({data:d});
  }
  })

});

//------------------------------------------------------
app.get('/mensageDeRegistro',(req,res)=>{
const registro = req.cookies.registro;
if(typeof registro !== 'undefined'){
  res.json({mensaje:registro});
}else{
  res.json({mensaje:false});
}
})
//------------------------------------------------------
app.get('/eliminarMensajeRegistro',(req,res)=>{

if(typeof req.cookies.registro !== 'undefined'){
 res.clearCookie('registro'); 
 res.json({mensaje:'Mensaje_Eliminadooo'});
}else{
  res.json({mensaje:false});
}

})
//------------------------------------------------------
app.get('/transaction',(req,res)=>{

const transaction = req.cookies.transaccion;

if(typeof transaction !== 'undefined'){
 console.log('transaction desde controllers',transaction);
 res.json({transaction}); 
}else{
res.json({message:false});
}

});
//------------------------------------------------------
app.get('/eliminarTransaction',(req,res)=>{
 res.clearCookie('transaccion');
 res.json({message:'transaccion eliminada'});
})
//------------------------------------------------------
app.get('/usuarios',(req,res)=>{
baseDatos.mostrarUsers(req,res);
})
//------------------------------------------------------
//------------------------------------------------------
app.get('/compras',(req,res)=>{
baseDatos.MostrarCompras(req,res);
})
//------------------------------------------------------
app.get('/addUser',(req,res)=>{
baseDatos.addUsers(req,res);
})
//------------------------------------------------------
app.post('/addUser',(req,res)=>{
  baseDatos.addUsersPost(req,res);
})
//------------------------------------------------------
app.get('/updateUser/:id',(req,res)=>{
baseDatos.updateUser(req,res);
})
//------------------------------------------------------
app.post('/updateUser/:id',(req,res)=>{
baseDatos.updateUserPost(req,res);
})
//------------------------------------------------------
app.get('/deleteUser/:id',(req,res)=>{
baseDatos.deleteUser(req,res);
});
//------------------------------------------------------
app.get('/deleteCompra/:id',(req,res)=>{
baseDatos.deleteCompra(req,res);
})
//------------------------------------------------------
app.post('/puntuaciones',verifyToken,(req,res)=>{
baseDatos.puntuaciones(req,res);
});
//------------------------------------------------------
//logout cliente
app.get('/logout',(req, res) => {
  //metodo para borrar la cookie
  res.clearCookie('token');
  res.redirect('/');
});
//------------------------------------------------------
app.get('/recuperarPassword',(req,res)=>{
res.render('recuperarPassword.ejs',{
   og: {
      title: 'Smarphone Solution',
      description: 'Venta de Productos Telefonicos',
      image: 'https://www.pexels.com/es-es/foto/persona-sosteniendo-un-smartphone-android-samsung-blanco-6347724/',
      // Otros metadatos OGP que desees especificar
      }
});
});
//------------------------------------------------------
app.post('/recuperarPassword',(req,res)=>{
baseDatos.enviarEmailRecuperacion(req,res);
});
//------------------------------------------------------
app.get('/restablecer-contrasena',(req,res)=>{  

const token = req.query.token;
const UserName = req.query.userName;

const tokenCookies = req.cookies.securityToken;

if(token == tokenCookies){
res.render('restablecer.ejs',{user:UserName, og: {
      title: 'Smarphone Solution',
      description: 'Venta de Productos Telefonicos',
      image: 'https://www.pexels.com/es-es/foto/persona-sosteniendo-un-smartphone-android-samsung-blanco-6347724/',
      // Otros metadatos OGP que desees especificar
      }});
}else{
res.send('Usuario denegado');
}

});
//------------------------------------------------------
app.post('/restablecer-contrasena',(req,res)=>{

baseDatos.restablecerPost(req,res);

});
//------------------------------------------------------
//logout administrador
app.get('/logout2',(req, res) => {
  res.clearCookie('token2');
  res.redirect('/');
});
//------------------------------------------------------
//Metodo para manejar rutas no encontradas
app.get('/*',(req,res)=>{
res.render('found.ejs')
});
//-------------------------------------------------------

server.listen(port,()=>{
  console.log(`Servidor corriendo exitosamente en el puerto ${port}`);
});
