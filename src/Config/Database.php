<?php

namespace Hirata\Config;

use PDO;
use PDOException;

/**
 * Database Configuration & Connection Manager (Singleton)
 * 
 * Gerencia conexão com MySQL usando PDO com suporte completo a:
 * - UTF-8 (utf8mb4) para Japonês, Vietnamita, Filipino
 * - Iene (¥) e caracteres especiais
 * - Exception handling robusto
 * 
 * @package Hirata\Config
 * @author Backend Team
 * @version 1.0.0
 */
class Database
{
    /**
     * Instância singleton da conexão PDO
     * @var self
     */
    private static ?self $instance = null;

    /**
     * Conexão PDO
     * @var PDO
     */
    private PDO $connection;

    /**
     * Configurações carregadas do .env
     * @var array
     */
    private array $config;

    /**
     * Construtor privado (Singleton Pattern)
     */
    private function __construct()
    {
        $this->config = $this->loadConfig();
        $this->connection = $this->createConnection();
    }

    /**
     * Retorna instância singleton da Database
     *
     * @return self
     * @throws PDOException Se falhar na conexão
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Carrega configurações do arquivo .env
     * 
     * Suporta dois formatos:
     * 1. Arquivo .env no diretório raiz (vlucas/phpdotenv style)
     * 2. Fallback para parse_ini_file se .env não existir
     *
     * @return array Configurações carregadas
     * @throws Exception Se nenhum arquivo de config for encontrado
     */
    private function loadConfig(): array
    {
        $envPath = $this->findEnvFile();
        
        if (!$envPath) {
            throw new \Exception('Arquivo .env não encontrado. Copie .env.example para .env');
        }

        $config = $this->parseEnvFile($envPath);

        return [
            'host'     => $config['DB_HOST'] ?? '127.0.0.1',
            'port'     => (int)($config['DB_PORT'] ?? 3306),
            'name'     => $config['DB_NAME'] ?? 'hirata_cars',
            'user'     => $config['DB_USER'] ?? 'root',
            'password' => $config['DB_PASS'] ?? '',
            'charset'  => $config['DB_CHARSET'] ?? 'utf8mb4',
        ];
    }

    /**
     * Localiza o arquivo .env
     *
     * @return string|null Path para arquivo .env ou null
     */
    private function findEnvFile(): ?string
    {
        $paths = [
            __DIR__ . '/../../.env',              // Backend direto
            __DIR__ . '/../../../.env',           // Raiz do projeto
            dirname(__DIR__, 3) . '/.env',        // Alternativa
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Parse arquivo .env (compatível com vlucas/phpdotenv)
     *
     * @param string $filePath Path do arquivo .env
     * @return array Variáveis parseadas
     */
    private function parseEnvFile(string $filePath): array
    {
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $config = [];

        foreach ($lines as $line) {
            // Ignorar comentários
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parsear linha KEY=VALUE
            if (strpos($line, '=') !== false) {
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remover aspas se existirem
                if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
                    (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
                    $value = substr($value, 1, -1);
                }

                $config[$key] = $value;
            }
        }

        return $config;
    }

    /**
     * Cria conexão PDO com MySQL
     *
     * Configurações:
     * - ATTR_ERRMODE_EXCEPTION: Lança exceções em erros SQL
     * - MYSQL_ATTR_INIT_COMMAND: Define UTF-8 na conexão
     * - ATTR_EMULATE_PREPARES: Usa prepared statements nativos
     * - ATTR_DEFAULT_FETCH_MODE: Retorna arrays associativos
     *
     * @return PDO
     * @throws PDOException Se falhar na conexão
     */
    private function createConnection(): PDO
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $this->config['host'],
            $this->config['port'],
            $this->config['name'],
            $this->config['charset']
        );

        $options = [
            // Exception handling
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            
            // UTF-8 para caracteres especiais (¥, 日本語, Việt, etc)
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            
            // Prepared statements nativos
            PDO::ATTR_EMULATE_PREPARES => false,
            
            // Retornar arrays associativos por padrão
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            
            // Timeout de conexão
            PDO::ATTR_TIMEOUT => 5,
        ];

        try {
            $pdo = new PDO($dsn, $this->config['user'], $this->config['password'], $options);
            
            // Log de sucesso em desenvolvimento
            if ($_ENV['APP_DEBUG'] ?? false) {
                error_log("✅ Conexão MySQL estabelecida: {$this->config['host']}:{$this->config['port']}/{$this->config['name']}");
            }

            return $pdo;
        } catch (PDOException $e) {
            throw new PDOException(
                "Falha na conexão MySQL: " . $e->getMessage(),
                (int)$e->getCode(),
                $e
            );
        }
    }

    /**
     * Retorna a conexão PDO
     *
     * @return PDO
     */
    public function getConnection(): PDO
    {
        return $this->connection;
    }

    /**
     * Executa query com prepared statement
     *
     * @param string $sql SQL statement com placeholders (?)
     * @param array $params Parâmetros para bind
     * @return \PDOStatement
     * @throws PDOException Se a query falhar
     */
    public function query(string $sql, array $params = []): \PDOStatement
    {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new PDOException(
                "Erro na query: " . $e->getMessage() . "\nSQL: $sql",
                (int)$e->getCode(),
                $e
            );
        }
    }

    /**
     * Fetch um resultado (primeira linha)
     *
     * @param string $sql
     * @param array $params
     * @return array|false
     */
    public function fetchOne(string $sql, array $params = [])
    {
        return $this->query($sql, $params)->fetch();
    }

    /**
     * Fetch todos os resultados
     *
     * @param string $sql
     * @param array $params
     * @return array
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll();
    }

    /**
     * Retorna a ID do último insert
     *
     * @return string
     */
    public function lastInsertId(): string
    {
        return $this->connection->lastInsertId();
    }

    /**
     * Inicia uma transação
     *
     * @return bool
     */
    public function beginTransaction(): bool
    {
        return $this->connection->beginTransaction();
    }

    /**
     * Confirma transação
     *
     * @return bool
     */
    public function commit(): bool
    {
        return $this->connection->commit();
    }

    /**
     * Reverte transação
     *
     * @return bool
     */
    public function rollBack(): bool
    {
        return $this->connection->rollBack();
    }

    /**
     * Testa conexão com MySQL
     *
     * @return bool
     */
    public static function testConnection(): bool
    {
        try {
            $db = self::getInstance();
            $db->query("SELECT 1");
            return true;
        } catch (PDOException $e) {
            error_log("Falha no teste de conexão: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Retorna informações da configuração (sem senha)
     *
     * @return array
     */
    public function getConfig(): array
    {
        return [
            'host' => $this->config['host'],
            'port' => $this->config['port'],
            'name' => $this->config['name'],
            'user' => $this->config['user'],
            'charset' => $this->config['charset'],
        ];
    }

    /**
     * Previne clonagem do singleton
     */
    private function __clone() {}

    /**
     * Previne desserialização do singleton
     */
    public function __wakeup() 
    {
        throw new \Exception("Não é possível desserializar Database singleton");
    }
}
