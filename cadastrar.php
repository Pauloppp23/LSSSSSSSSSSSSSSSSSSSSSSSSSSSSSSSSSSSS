<?php
// cadastrar.php

// 1. Inicia a sessão para podermos logar o usuário automaticamente após o cadastro.
session_start();

// 2. Inclui o arquivo de conexão
include 'conexao.php';

// 3. Verifica se os dados foram enviados via POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // 4. Pega os dados do formulário e limpa espaços em branco
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    $password = trim($_POST['password']);

    // 5. Validação no servidor (nunca confie apenas no front-end)
    if (empty($username) || empty($email) || empty($password)) {
        die("Erro: Todos os campos são obrigatórios. <a href='index.php#cadastro'>Tentar novamente</a>");
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die("Erro: Formato de e-mail inválido. <a href='index.php#cadastro'>Tentar novamente</a>");
    }
    if (strlen($password) < 6) { // Exemplo: exigir senha com no mínimo 6 caracteres
        die("Erro: A senha deve ter no mínimo 6 caracteres. <a href='index.php#cadastro'>Tentar novamente</a>");
    }

    // 6. Verifica se o e-mail ou username já existem no banco
    $stmt = $conexao->prepare("SELECT id FROM usuarios WHERE email = ? OR username = ?");
    $stmt->bind_param("ss", $email, $username);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        die("Erro: E-mail ou nome de usuário já cadastrado. <a href='index.php#cadastro'>Escolha outros</a>");
    }
    $stmt->close();

    // 7. Criptografa a senha com o método mais seguro disponível no PHP
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // 8. Prepara e executa a inserção no banco de dados
    $stmt = $conexao->prepare("INSERT INTO usuarios (username, email, password_hash) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $username, $email, $password_hash);

    // 9. Executa e verifica o resultado
    if ($stmt->execute()) {
        // CADASTRO BEM-SUCEDIDO!
        
        // ⭐ MELHORIA: LOGAR AUTOMATICAMENTE O USUÁRIO ⭐
        // Pegamos o ID do usuário que acabamos de criar
        $novo_id = $stmt->insert_id;

        // Armazenamos os dados na sessão, exatamente como no login.php
        $_SESSION['user_id'] = $novo_id;
        $_SESSION['username'] = $username;
        
        // Redirecionamos para a página inicial, já logado!
        header("Location: index.php#inicio");
        exit();

    } else {
        // Erro ao inserir no banco
        die("Erro ao cadastrar. Por favor, tente novamente. Erro: " . $stmt->error . " <a href='index.php#cadastro'>Voltar</a>");
    }

    // 10. Fecha o statement e a conexão
    $stmt->close();
    $conexao->close();

} else {
    // Se alguém tentar acessar o arquivo diretamente
    header("Location: index.php");
    exit();
}
?>