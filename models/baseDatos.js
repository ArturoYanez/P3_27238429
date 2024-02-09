// -*- coding: utf-8 -*-
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const ip = require('ip');
const { secretKey,apiKeyy} = process.env;
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
//

//Mnesaje de Bienvenida
const transporter = nodemailer.createTransport({
  service:'Gmail',
  auth:{
    user:'elrandygraterol@gmail.com',
    pass:'qzpuaxksmeduqjvt'
  }
});


//Mensaje de recuperacion
const transporter2 = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'elrandygraterol@gmail.com',
    pass: 'qzpuaxksmeduqjvt'
  }
});


// Crear la base de datos
const dbname = path.join(__dirname,'../db','base.db');
const db = new sqlite3.Database(dbname,{verbose:true,charset:'utf8'},err=>{
  if(err) return console.error(err.message);
  console.log('Conexion Exitosa con la Base de Datos')
});

db.serialize(() => {
// Crear la tabla "categorias" si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
  )
`);
//------------------------------------------------------------------
// Crear la tabla "Productos" si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS productos (
    producto_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    codigo INTEGER NOT NULL,
    precio INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    color TEXT NOT NULL,
    peso INTEGER NOT NULL,
    categoria_id INTEGER,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  )
`);
//-----------------------------------------------------------------
db.run(`
  CREATE TABLE IF NOT EXISTS imagenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    destacado INTEGER DEFAULT 0,
    productoID INTEGER,
    FOREIGN KEY (productoID) REFERENCES productos(producto_id)
  )
`);
//----------------------------------------------------------------
db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    cedula INTEGER NOT NULL,
    correo VARCHAR NOT NULL,
    password VARCHAR NOT NULL 
  )
`);
//----------------------------------------------------------------

db.run(`
  CREATE TABLE IF NOT EXISTS compras (
    compras_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_de_usuario TEXT,
    apellido TEXT,
    cedula INTEGER,
    marca_dispositivo TEXT,
    cliente_id INTEGER,
    producto_id INTEGER,
    cantidad INTEGER,
    total_pagado REAL,
    fecha TIMESTAMP NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    ip_cliente TEXT,
    codigo INTEGER,
    numeroT INTEGER,
    cvv INTEGER,
    mesV TEXT,
    year INTEGER,
    currency TEXT,
    descripcion TEXT
);
CREATE TRIGGER set_fecha AFTER INSERT ON compras
BEGIN
  UPDATE compras
  SET fecha = strftime('%Y-%m-%d %H:%M:%S', 'now')
  WHERE cliente_id = new.cliente_id
    AND producto_id = new.producto_id
    AND cantidad = new.cantidad
    AND total_pagado = new.total_pagado
    AND ip_cliente = new.ip_cliente;
END;
`);

db.run(`CREATE TABLE IF NOT EXISTS puntuaciones (
  puntuacionID INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_de_usuario TEXT NOT NULL,
  puntuacion INTEGER NOT NULL,
  producto_id INTEGER,
  FOREIGN KEY (producto_id) REFERENCES productos(producto_id)
);`);


//----------------------------------------------------------------
});

function aggDato(req,res){
const {nombre,codigo,precio,descripcion,color,peso,categoria} = req.body;
    
const sql = `INSERT INTO productos(nombre, codigo, precio, descripcion, color, peso , categoria_id) 
    VALUES (?, ?, ?, ?, ?, ? , ?)`;

db.run(sql, [nombre, codigo, precio, descripcion, color, peso , categoria], err => {
    if (err) return console.error(err.message);
    console.log('Registros Ingresados Correctamente a la base de datos ');
    res.redirect('/productos');
});
}

function mostrarProductos(req,res){
 const sql = `SELECT * FROM productos`;
 db.all(sql,[],(err,rows)=>{
 if(err) return console.error(err.message);
 console.log('Leyendo Tabla productos...')
 res.render('productos.ejs',{modelo:rows});
})
}

function mostrarUpdate(req,res){

  const id = req.params.id;
  const sql = `SELECT * FROM productos WHERE producto_id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) return console.error(err.message);
    res.render('update.ejs', {modelo:row});
  })

}

function update(req,res){
  const id = req.params.id;

  const {nombre,codigo,precio,descripcion,color,peso,categoria} = req.body;
  
  const sql = `UPDATE productos SET nombre = ?, codigo = ?, precio = ?, descripcion = ?, color = ?, peso = ?, categoria_id = ? WHERE producto_id = ?`;

  db.run(sql, [nombre,codigo, precio,descripcion,color, peso , categoria , id], err => {
  if (err) return console.error(err.message);
  console.log(`producto actualizado = Producto : ${id}`);
  res.redirect('/productos');
  });

}
//-----------------------------------------------
function getImagen(req,res){
const id = req.params.id; 
const sql = `SELECT * FROM productos WHERE producto_id = ?`
db.get(sql, [id], (err, row) => {
  console.log(row,'+++++++++++++++');
    if (err){
      res.status(500).send({ error: err.message });
      return console.error(err.message);
    }
    res.render('addImagen.ejs', { modelo:row});
  });
 //const sql = `SELECT * FROM productos WHERE producto_id = ?`; 
}
//---------------------------------------------------------
function mostrarDelete(req,res){
    const id = req.params.id;
  const sql = `SELECT * FROM productos WHERE producto_id = ?`;

  db.get(sql, [id], (err, row) => {
    if (err){
      res.status(500).send({ error: err.message });
      return console.error(err.message);
    }
    res.render('delete.ejs', { modelo:row});
  });
}

function deletee(req,res){
 const id = req.params.id;
  console.log('Consulta Eliminar');
  const sql = `
    DELETE FROM productos WHERE producto_id = ?
  `;
  db.run(sql, [id], err => {
    if (err) {
      res.status(500).send({ error: err.message });
      return console.error(err.message);
    }
    console.log('Producto eliminado');
    res.redirect('/productos');
  });
}

//_-------------------------------------------------
function aggIMG(req,res){

const id = req.params.id;
const file = `/uploads/${req.file.filename}`;
const rutaAbsoluta = `${req.protocol}://${req.get('host')}${file}`;
console.log(file,'---dato de la funcion aggIMG---');
const {destacado} = req.body;
const sql = `INSERT INTO imagenes(url,destacado,productoID) 
 VALUES (?,?,?)`;
    db.run(sql, [rutaAbsoluta,destacado,id], err =>{
    if (err) return console.error(err.message);
    console.log('URL de imagen Insertada Correctamente');
    res.redirect('/productos');
});
  /* const id = req.params.id;
   console.log(req.file);
  let ruta = req.file.path.split('\\');
  const file = `/${ruta[1]}/${ruta[2]}`;
  console.log(file);
  const {destacado} = req.body;
  const sql = `INSERT INTO imagenes(url,destacado,productoID) 
  VALUES (?,?,?)`;

  db.run(sql, [file,destacado,id], err => {
    if (err) return console.error(err.message);
    console.log('URL de imagen Insertada Correctamente');
    res.redirect('/productos');
  });*/

}
//----------------------------------------------------

function getCategorias(req,res){
 const sql = `SELECT * FROM categorias`;
 db.all(sql,[],(err,rows)=>{
 console.log(rows,);
 if(err) return console.error(err.message);
 console.log('Leyendo Tabla categorias...')
 res.render('categorias.ejs',{modelo:rows});
})
}

function postCategorias(req,res){
const {nombre} = req.body
const sql = `INSERT INTO categorias(nombre) 
    VALUES (?)`;

db.run(sql, [nombre], err => {
    if (err) return console.error(err.message);
    console.log('categoria ingresada correctamente');
    res.redirect('/categorias');
});

}

function mostrarUpdateC(req,res){
  //Este metodo es el GET
    const id = req.params.id;
    const sql = `SELECT * FROM categorias WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
    console.log(row);
    if (err) return console.error(err.message);
    res.render('updateCategorias.ejs', {modelo:row});
  })
}

function updateCateg(req,res){
//Este metodo es el POST
   const id = req.params.id;

  const {nombre} = req.body;
  
  const sql = `UPDATE categorias SET nombre = ? WHERE id = ?`;

  db.run(sql, [nombre,id], err => {
  if (err) return console.error(err.message);
  console.log(`Categoria actualizada = Categoria : ${id}`);
  res.redirect('/categorias');
  });

}
//------------------------------------------------------------
function filtrar(req,res){

const busqueda = req.query.busqueda;

const sql = `SELECT productos.*, imagenes.url
FROM productos
LEFT JOIN imagenes ON productos.producto_id = imagenes.productoID WHERE nombre = ? OR descripcion = ? OR categoria_id = ? OR color = ? OR peso = ?`;

db.all(sql,[busqueda,busqueda,busqueda,busqueda,busqueda],(err,rows)=>{
  console.log(rows,'base de datos de la funcion filtrar');

  if(err){
     console.error(err.message);
      res.status(500).send('Error en el servidor');
      return;
  }

 res.json({producto:rows})

})  
  
}
//-------------------------------------------------------
 
//--------------------------------------------------
function detalles(req,res){
  const id = req.params.id;
  const sql = `SELECT imagenes.url, productos.*
               FROM imagenes
               INNER JOIN productos ON imagenes.productoID = productos.producto_id
               WHERE imagenes.productoID = ?`;
  db.all(sql,[id],(err,rowsImagenes)=>{
    console.log(rowsImagenes,'funcion detalles');
     if (err){
      console.error(err.message);
      res.status(500).send('Error en el servidor');
      return;
    } 
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // Envío de la respuesta con los resultados
      res.render('detalles.ejs',{
        imagenes:rowsImagenes,
        og: {
      title: 'Smarphone Solution',
      description: 'Venta de Productos Telefonicos',
      image: 'https://www.pexels.com/es-es/foto/persona-sosteniendo-un-smartphone-android-samsung-blanco-6347724/',
      // Otros metadatos OGP que desees especificar
      }
      });

  });
}
function deleteCategoriaGET(req,res){

const id = req.params.id;
const sql = `DELETE FROM productos WHERE categoria_id IN (SELECT id FROM categorias WHERE id = ?);`;
 db.run(sql, [id], err => {
    if (err) {
      res.status(500).send({ error: err.message });
      return console.error(err.message);
    }

    const sql2=`DELETE FROM categorias WHERE id = ?`;

    db.run(sql2,[id],er=>{
    
    if(er){
       res.status(500).send({ error: err.message });
       return console.error(err.message);
    }
    console.log('Categoria eliminada');
    res.redirect('/categorias');
    })

  });
}
//--------------------------------------------------
function loginUsers(req,res){
  res.render('loginUsers.ejs',{
     og: {
      title: 'Smarphone Solution',
      description: 'Venta de Productos Telefonicos',
      image: 'https://www.pexels.com/es-es/foto/persona-sosteniendo-un-smartphone-android-samsung-blanco-6347724/',
      // Otros metadatos OGP que desees especificar
      }
  });
}
//_-------------------------------------------------
function registroUsers(req,res){
  res.render('registroUsers.ejs',{
    og: {
      title: 'Smarphone Solution',
      description: 'Venta de Productos Telefonicos',
      image: 'https://www.pexels.com/es-es/foto/persona-sosteniendo-un-smartphone-android-samsung-blanco-6347724/',
      // Otros metadatos OGP que desees especificar
      }
  });
}
//--------------------------------------------------
function registroUsuariosPost(req,res){

  const {nombre,apellido,cedula,email,contrasena} = req.body;

  const sql=`INSERT INTO usuarios(nombre,apellido,cedula,correo,password)
  VALUES(?,?,?,?,?)`;

 db.run(sql,[nombre,apellido,cedula,email,contrasena],e=>{

 if(e) return console.error(e.message);

  res.cookie('registro','exito',{httpOnly:true,secure:true});
  
  const mensaje = {
  from:'elrandygraterol@gmail.com',
  to:email,
  subject:'!Bienvenido a nuestra página web¡',
  text:`Hola ${nombre} , !Te damos la Bienvenida a una de las mejores páginas de venta y compra de Smarphone, donde podras encontrar gran variedad de productos y marcas¡`
  }

  transporter.sendMail(mensaje,(error,info)=>{

   if(error){
   console.log(error.message);
   }else{
    console.log(`Mensaje de Bienvenida enviado Exitosamente ${info.response}`);
   }

  })

 res.redirect('/loginUsers');

 });
}
//-------------------------------------------------
 function ClientesGET(req,res){

  const sql =`SELECT p.*, i.url AS imagen_url, pu.puntuacion
             FROM productos p
             LEFT JOIN imagenes i ON p.producto_id = i.productoID
             LEFT JOIN puntuaciones pu ON p.producto_id = pu.producto_id
             WHERE i.destacado = 1
             GROUP BY p.producto_id`;

  db.all(sql,[],(err, rowsProduct) => {
    console.log(rowsProduct,'....+..+....Clientes.ejs');

  
//-------------------------------------------

       if (err){
      console.error(err.message);
      res.status(500).send('Error en el servidor');
      return;
    } 
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
//------------------------------------------------------------------
//------------------------------------------------------------------
     res.render('clientes.ejs',{
        producto:rowsProduct,
         og: {
      title: 'Smarphone Solution',
      description: 'Venta de Productos Telefonicos',
      image: 'https://www.pexels.com/es-es/foto/persona-sosteniendo-un-smartphone-android-samsung-blanco-6347724/',
      // Otros metadatos OGP que desees especificar
      }
      }); 
      
    });
}
//-------------------------------------------------
function postLoginCliente(req,res){
 const {email,password} = req.body;

  const dato = {
    email:email,
    password:password,
    cedula:'',
    nombre:''
  }

  const sql = 'SELECT * FROM usuarios WHERE correo = ? AND password = ?';

  db.get(sql,[dato.email,dato.password],(err,datos)=>{
  console.log(datos,'datos del inicio de sesion');
 if(err) return console.error(err.message);

if(datos){

 if(datos.correo == dato.email && datos.password == dato.password){
  dato.cedula=datos.cedula;
  dato.nombre=datos.nombre;
  const token = jwt.sign({user:dato},secretKey,{expiresIn:'1h'});

   // Guardar token en cookies
  res.cookie('token', token, { httpOnly: true, secure: true });

  res.redirect('/clientes');
 } 

}else{
  res.json({Error:'Contraseña O Usuario Incorrecto , vuelve a intentarlo'});
}


  })
  
  
}
//--------------------------------------------------
function comprar(req,res){
  //Datos del usuario provenientes del Token
  const userEmail = req.user.email;

  const cedula = req.user.cedula;

  console.log(cedula,'cedula');

  console.log(`Datos del usuario proveniente del token : ${userEmail}`);
  //id del producto en cuestión
  const id = req.params.id;
  //Direccion IP
    const ipAddress = ip.address();

  console.log(typeof ipAddress);

  const sql=`SELECT usuarios.id, usuarios.nombre AS nombre_usuario, usuarios.apellido, usuarios.cedula, productos.*
FROM usuarios, productos
WHERE usuarios.correo = ? AND productos.producto_id = ?;`

db.all(sql,[userEmail,id],(error,data)=>{
  console.log(data[0],'datos del usuario desde la compra');
 console.log(`Direccion IP : ${ipAddress} del usuario ${data[0].nombre_usuario}`);

if(error) return console.log(`ERROR[-::-]${error}`);

console.log(data[0]); 

 res.render('comprar.ejs',{
        resultado:data[0],
        ip:{ipAddress,cedula},
        og: {
      title: 'Smarphone Solution',
      description: 'Venta de Productos Telefonicos',
      image: 'https://www.pexels.com/es-es/foto/persona-sosteniendo-un-smartphone-android-samsung-blanco-6347724/',
      // Otros metadatos OGP que desees especificar
      }
      });

});
  
}
//--------------------------------------------------
async function comprarPOST(req,res){
//Email proveniente del token de seguridad 
const destinatario = req.user.email;
let data;

const {nombre_de_usuario,apellido,cedula,telefono,cliente_id,producto_id,cantidad,total_pagado,codigo,ip_cliente,numeroT,cvv,mesV,year,currency,descripcion} = req.body;

    const paymentData = {
    "amount": total_pagado,
    "card-number":numeroT,
    "cvv":cvv,
    "expiration-month":mesV,
    "expiration-year":year,
    "full-name": "APROVED",
    "currency":currency,
    "description":descripcion,
    "reference":codigo
};
    await axios.post('https://fakepayment.onrender.com/payments', paymentData, {
      headers:{
        Authorization: `Bearer ${apiKeyy}`
      },
    })
    .then(response=>{
    data = response.data;

    if(data){
       res.cookie('transaccion', data, { httpOnly: true, secure: true });
       console.log(data,'transaction');
    }else{
      console.log('error al comprobar tarjeta de credito');
    }
   
    
    })
    .catch(err=>{
    console.error(err.message);
    });

const sql = `INSERT INTO compras(nombre_de_usuario,apellido,cedula,marca_dispositivo,cliente_id,producto_id,cantidad,total_pagado,ip_cliente,codigo,numeroT,cvv,mesV,year,currency,descripcion) 
VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

db.run(sql,[nombre_de_usuario,apellido,cedula,telefono,cliente_id,producto_id,cantidad,total_pagado,ip_cliente,codigo,numeroT,cvv,mesV,year,currency,descripcion],(err)=>{
  if(err) return console.error(err.message);
    
    //Enviar mensaje de confirmacion por correo electronico
  // Configure los detalles del correo electrónico
  const mailOptions = {
    from: 'elrandygraterol@gmail.com', // Reemplaza con tu dirección de correo electrónico
    to: destinatario, // Reemplaza con la dirección de correo del cliente
    subject:'Mensaje de confirmación de compra exitosa', // Reemplaza con el asunto del correo electrónico
    text: 'Gracias por preferirnos a la hora de comprar telefonos mobiles , su compra a sido exitosa' // Reemplaza con el contenido del correo electrónico en texto sin formato
  };

  // Envía el correo electrónico
  transporter2.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error al enviar el correo electrónico:', error);
      res.status(500).send('Ha ocurrido un error al enviar el correo electrónico de confirmación.');
    } else {
      console.log('Correo electrónico enviado:', info.response);
      res.status(200).send('El correo electrónico de confirmación ha sido enviado correctamente.');
    }
  });

    res.redirect('/clientes');
   
});

}

function mostrarUsers(req,res){

const SQL = `SELECT * FROM usuarios`;

db.all(SQL,[],(err,rows)=>{
if(err) return console.error(err.message);
res.render('userList.ejs',{modelo:rows})
})

}

function MostrarCompras(req,res){

const SQL = `SELECT * FROM compras`;

db.all(SQL,[],(err,rows)=>{
if(err) return console.error(err.message);
res.render('mostrarCompras.ejs',{modelo:rows});
})

}

function addUsers(req,res){
res.render('addUsers.ejs');
}

function addUsersPost(req,res){

const {nombre,apellido,cedula,correo,password} = req.body;

const sql = `INSERT INTO usuarios(nombre,apellido,cedula,correo,password) VALUES(?,?,?,?,?)`;

db.run(sql,[nombre,apellido,cedula,correo,password],(err)=>{

if(err) return console.error(err.message);

res.redirect('/usuarios');

})

}

function updateUser(req,res){

  const id = req.params.id;

  const sql = `SELECT * FROM usuarios WHERE id = ?`; 

  db.get(sql,[id],(err,datos)=>{
  if(err) return console.error(err.message);
  res.render('updateUser.ejs',{modelo:datos});
  })

}

function updateUserPost(req,res){
  const {nombre,apellido,cedula,correo,password} = req.body;
  const id = req.params.id;
  const sql = `UPDATE usuarios SET nombre = ?, apellido = ? , cedula = ? , correo = ? , password = ? WHERE id = ?`;
  db.run(sql,[nombre,apellido,cedula,correo,password,id],(err)=>{
  if(err) return console.error(err.message);
  res.redirect('/usuarios');
  })
}

function deleteUser(req,res){
  const id = req.params.id;
  const sql = `DELETE FROM usuarios WHERE id = ?`;
  db.run(sql,[id],(e)=>{
  if(e) return console.error(e.message);
  res.redirect('/usuarios');
  })
}

function deleteCompra(req,res){
  const id = req.params.id;
  const sql = `DELETE FROM compras WHERE compras_id = ?`;
  db.run(sql,[id],(e)=>{
    if(e) return console.error(e.message);
    res.redirect('/compras');
  })
}

function puntuaciones(req,res){

const UserName = req.user.nombre;

const {puntuacion,idProducto} = req.body;

console.log(` puntuacion ${puntuacion} del producto con el id : ${idProducto} nombre del usuario ${UserName}`);

const sql = `SELECT * FROM puntuaciones WHERE producto_id = ?`;

db.get(sql,[idProducto],(error,datos)=>{

  // Obtener la puntuación actual del producto
  //                               operador ternario
  const puntuacionActual = datos ? datos.puntuacion : 0;
   
  // Calcular la nueva puntuación sumando la puntuación actual con la nueva puntuación
  const nuevaPuntuacion = puntuacionActual + puntuacion;


if(puntuacionActual == 0){

  /////////////////////////////////////////////////////////
const sql2=`INSERT INTO puntuaciones (nombre_de_usuario,puntuacion,producto_id)
VALUES (?,?,?)`;

db.run(sql2,[UserName,puntuacion,idProducto],(e)=>{

if(e) return console.log(e.message);

const sql3 = `SELECT * FROM puntuaciones WHERE producto_id = ?`;
        db.get(sql3, [idProducto], (errorNew, datosNew) => {

          if (errorNew) return console.error(errorNew.message);
          
          console.log('Puntuación agregada:', puntuacion);

          res.json({puntuacion: datosNew.puntuacion});
        });

});

}else{

    if(datos.nombre_de_usuario == UserName && datos.producto_id == idProducto){
      console.log(`El usuario ${UserName} ya califico el producto`);
     res.json({interruptor:true});
    }else{
     
     // Actualizar la puntuación en la base de datos
    const sqlUpdate = `UPDATE puntuaciones SET puntuacion = ?,nombre_de_usuario = ? WHERE producto_id = ?`;
    db.run(sqlUpdate, [nuevaPuntuacion,UserName,idProducto], errorUpdate => {
      if (errorUpdate) return console.error(errorUpdate.message);

      console.log(`Puntuación actualizada: ${nuevaPuntuacion}`);

      // Enviar la nueva puntuación al frontend
      res.json({ puntuacion: nuevaPuntuacion,interruptor:false});
    });

    }
    

}

///////////////////////////////////////////////////////

});

}

function enviarEmailRecuperacion(req,res){
  const email = req.body.email;
  const UserName = req.body.userName;
// Generar un token único
  const token = crypto.randomBytes(20).toString('hex');

  // Almacenar el token en tu base de datos o en una estructura de datos adecuada junto con la información del usuario
 res.cookie('securityToken',token, { httpOnly: true, secure: true });

  // Crear la URL de recuperación de contraseña
  const recoveryURL = `http://tu-sitio-web.com/restablecer-contrasena?token=${token}?userName=${UserName}`;

  // Enviar el correo electrónico de recuperación de contraseña
  const mailOptions = {
    from: 'tu_correo@gmail.com',
    to: email,
    subject: 'Recuperación de contraseña',
    text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${recoveryURL}`
  };

  transporter2.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.send('Error al enviar el correo electrónico de recuperación de contraseña');
    } else {
      console.log('Correo electrónico de recuperación de contraseña enviado:', info.response);
    }

});

  res.redirect('/loginUsers');

}

function restablecerPost(req,res){

const {passwordC,userName} = req.body;

const sql = `UPDATE usuarios SET password = ? WHERE nombre = ?`;
de.run(sql,[passwordC,userName],e=>{

 if(e){
  res.json({error:'No se pudo restablecer la contraseña User Incorrecto'});
 }else{
  res.redirect('/loginUsers');
 }

})

}


//--------------------------------------------------
module.exports={
 aggDato,
 mostrarProductos,
 mostrarUpdate,
 update,
 mostrarDelete,
 deletee,
 aggIMG,
 getCategorias,
 postCategorias,
 mostrarUpdateC,
 updateCateg,
 filtrar,
 ClientesGET,
 getImagen,
 detalles,
 deleteCategoriaGET,
 loginUsers,
 registroUsers,
 registroUsuariosPost,
 loginUsers,
 postLoginCliente,
 comprar,
 comprarPOST,
 mostrarUsers,
 MostrarCompras,
 addUsers,
 addUsersPost,
 updateUser,
 updateUserPost,
 deleteUser,
 deleteCompra,
 puntuaciones,
 enviarEmailRecuperacion,
 restablecerPost
}