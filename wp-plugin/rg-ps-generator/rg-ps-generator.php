<?php
/**
 * Plugin Name: RG PS Generator
 * Description: PS1 & PS3 Producer Statement PDF generator for Royal Glass Limited
 * Version:     1.0.0
 * Author:      Royal Glass
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'RGPS_DIR', plugin_dir_path( __FILE__ ) );
define( 'RGPS_URL', plugin_dir_url( __FILE__ ) );

// ── Header: dark background on PS generator page only ────────────────
add_action( 'wp_head', 'rgps_header_styles' );
function rgps_header_styles() {
    global $post;
    if ( ! $post || ! has_shortcode( $post->post_content, 'rg_ps_generator' ) ) return;
    ?>
    <style>
      #masthead {
        background-color: #3d3d3d !important;
      }
      #masthead a,
      #masthead .main-header-menu .menu-item > a,
      #masthead .ast-builder-menu-1 .menu-item > a {
        color: #ffffff !important;
      }
      #masthead .menu-toggle,
      #masthead .ast-mobile-menu-trigger-toggle,
      #masthead .ast-mobile-menu-trigger-toggle span {
        color: #ffffff !important;
      }

      /* Expand only the page content area — not the header */
      #primary .entry-content,
      #main .entry-content,
      main .entry-content,
      #content .entry-content {
        max-width: 100% !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        padding-top: 2rem !important;
      }

      #rgps-root {
        margin-top: 0;
        max-width: 760px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }
    </style>
    <?php
}

// ── Activation: create table & default options ───────────────────────
register_activation_hook( __FILE__, 'rgps_activate' );
function rgps_activate() {
    global $wpdb;
    $table   = $wpdb->prefix . 'rgps_records';
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( "CREATE TABLE IF NOT EXISTS {$table} (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        client_name     VARCHAR(200) NOT NULL,
        address         VARCHAR(300) NOT NULL,
        bc_number       VARCHAR(50),
        lot_description VARCHAR(300),
        system_type     VARCHAR(50)  NOT NULL,
        substrate       VARCHAR(50)  NOT NULL,
        structure       VARCHAR(100) NOT NULL,
        location        VARCHAR(50)  NOT NULL,
        new_or_existing VARCHAR(20)  NOT NULL,
        thickness       VARCHAR(5),
        glass_type      VARCHAR(20)  NOT NULL DEFAULT 'Toughened',
        ps              VARCHAR(10)  NOT NULL DEFAULT 'PS1',
        filename        VARCHAR(400)
    ) {$charset};" );

    if ( ! get_option( 'rgps_access_password' ) ) {
        add_option( 'rgps_access_password', 'royalglass2025' );
    }
}

// ── Admin settings page ──────────────────────────────────────────────
add_action( 'admin_menu', function () {
    add_options_page( 'RG PS Generator', 'RG PS Generator', 'manage_options', 'rg-ps-generator', 'rgps_settings_page' );
} );

function rgps_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) return;
    if ( isset( $_POST['rgps_save'] ) ) {
        check_admin_referer( 'rgps_settings' );
        update_option( 'rgps_access_password', sanitize_text_field( $_POST['rgps_access_password'] ) );
        echo '<div class="updated"><p>Saved.</p></div>';
    }
    $pw = esc_attr( get_option( 'rgps_access_password', '' ) );
    echo '<div class="wrap"><h1>RG PS Generator Settings</h1>
    <form method="post">
        ' . wp_nonce_field( 'rgps_settings', '_wpnonce', true, false ) . '
        <table class="form-table">
            <tr><th>Access Password</th>
                <td><input type="text" name="rgps_access_password" value="' . $pw . '" class="regular-text" /></td>
            </tr>
        </table>
        <p><input type="submit" name="rgps_save" class="button-primary" value="Save Changes" /></p>
    </form></div>';
}

// ── Shortcode ────────────────────────────────────────────────────────
add_shortcode( 'rg_ps_generator', 'rgps_shortcode' );
function rgps_shortcode() {
    wp_enqueue_script( 'pdf-lib',   'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js', [], null, true );
    wp_enqueue_script( 'rgps-app',  RGPS_URL . 'assets/app.js', [ 'pdf-lib' ], '1.0.0', true );
    wp_enqueue_style(  'rgps-style', RGPS_URL . 'assets/style.css', [], '1.0.0' );

    wp_localize_script( 'rgps-app', 'RGPSConfig', [
        'ajaxUrl' => admin_url( 'admin-ajax.php' ),
        'nonce'   => wp_create_nonce( 'rgps_nonce' ),
    ] );

    ob_start(); ?>
    <div id="rgps-root">

      
      <div id="rgps-password-gate">
        <div id="rgps-password-box">
          <h2>Sign In</h2>
          <p>Enter the access password to continue.</p>
          <input type="password" id="rgps-pwd-input" placeholder="Password" />
          <p id="rgps-password-error"></p>
          <button class="rgps-btn rgps-btn-primary" id="rgps-signin-btn">Sign In</button>
        </div>
      </div>

      <div id="rgps-app" style="display:none;">

        <!-- ── Form view ── -->
        <div id="rgps-form-view">

          <div class="rgps-card">
            <h2>Project Details</h2>
            <div class="rgps-field">
              <label for="rgps-clientName">Client / Designer Name <span class="rgps-req">*</span></label>
              <input type="text" id="rgps-clientName" placeholder="e.g. Royal Glass" />
            </div>
            <div class="rgps-field">
              <label for="rgps-address">Property Address <span class="rgps-req">*</span></label>
              <input type="text" id="rgps-address" placeholder="e.g. 13E Paul Matthews Rd" />
            </div>
            <div class="rgps-field">
              <label for="rgps-bcNumber">BC Number <span class="rgps-opt">(optional)</span></label>
              <input type="text" id="rgps-bcNumber" placeholder="e.g. BCO12345678" />
            </div>
            <div class="rgps-field">
              <label for="rgps-lotDescription">Lot Description</label>
              <input type="text" id="rgps-lotDescription" />
            </div>
          </div>

          <div class="rgps-card">
            <h2>System &amp; Installation</h2>
            <div class="rgps-field">
              <label for="rgps-system">System</label>
              <select id="rgps-system">
                <option value="mini-post">Mini Post</option>
                <option value="double-disc">Double Disc</option>
                <option value="side-channel">Side Mount Channel</option>
                <option value="top-channel">Top Mount Channel</option>
              </select>
            </div>
            <div class="rgps-field">
              <label for="rgps-substrate">Structure Material</label>
              <select id="rgps-substrate">
                <option value="Timber">Timber</option>
                <option value="Concrete">Concrete</option>
                <option value="Steel">Steel</option>
              </select>
            </div>
            <div class="rgps-field">
              <label for="rgps-structure">Structure Type</label>
              <select id="rgps-structure">
                <option value="Deck">Deck</option>
                <option value="Balcony">Balcony</option>
                <option value="Pool">Pool Area</option>
                <option value="Stair">Stair Area</option>
                <option value="Landing">Landing</option>
                <option value="Stair and Balcony">Stair and Balcony Area</option>
              </select>
            </div>
            <div class="rgps-field">
              <label>Location</label>
              <div class="rgps-radio-group">
                <label><input type="checkbox" name="rgps-location" value="Internal" /> Internal</label>
                <label><input type="checkbox" name="rgps-location" value="External" checked /> External</label>
              </div>
            </div>
            <div class="rgps-field">
              <label>Structure Built</label>
              <div class="rgps-radio-group">
                <label><input type="radio" name="rgps-newOrExisting" value="New" checked /> New</label>
                <label><input type="radio" name="rgps-newOrExisting" value="Existing" /> Existing</label>
              </div>
            </div>
            <div class="rgps-field">
              <label>Glass Type</label>
              <div class="rgps-radio-group">
                <label><input type="radio" name="rgps-glassType" value="Toughened" checked /> Toughened</label>
                <label><input type="radio" name="rgps-glassType" value="Laminated" /> Laminated</label>
              </div>
            </div>
            <div class="rgps-field">
              <label for="rgps-thickness">Glass Thickness</label>
              <select id="rgps-thickness">
                <option value="12" selected>12mm</option>
                <option value="13.2">13.2mm</option>
                <option value="15">15mm</option>
              </select>
            </div>
            <div class="rgps-field">
              <label>Gate Required?</label>
              <div class="rgps-radio-group">
                <label><input type="radio" name="rgps-requiresGate" value="Yes" /> Yes</label>
                <label><input type="radio" name="rgps-requiresGate" value="No" checked /> No</label>
              </div>
            </div>
          </div>

          <div class="rgps-btn-row">
            <button class="rgps-btn rgps-btn-primary"   data-mode="ps1">Generate PS1</button>
            <button class="rgps-btn rgps-btn-secondary" data-mode="ps3">Generate PS3</button>
            <button class="rgps-btn rgps-btn-both"      data-mode="both">Generate Both</button>
          </div>
          <div class="rgps-btn-row" style="margin-top:.5rem;">
            <button class="rgps-btn rgps-btn-db"    id="rgps-btn-database">PS Database</button>
            <button class="rgps-btn rgps-btn-clear" id="rgps-btn-clear">Clear</button>
          </div>
          <div id="rgps-status"></div>

        </div><!-- /#rgps-form-view -->

        <!-- ── Records view ── -->
        <div id="rgps-records-view" style="display:none;">

          <div class="rgps-records-page-header">
            <button class="rgps-btn rgps-btn-back" id="rgps-btn-back">&#8592; Back</button>
            <span class="rgps-records-page-title">PS Database</span>
          </div>

          <div class="rgps-card">
            <div class="rgps-records-controls">
              <label>Show
                <select id="rgps-records-limit">
                  <option value="10">10</option>
                  <option value="20" selected>20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                per page
              </label>
              <div class="rgps-records-nav">
                <span id="rgps-records-info"></span>
                <button class="rgps-btn-page" id="rgps-btn-prev" disabled>&#8592; Prev</button>
                <button class="rgps-btn-page" id="rgps-btn-next" disabled>Next &#8594;</button>
              </div>
            </div>
            <div style="overflow-x:auto;">
              <table>
                <thead><tr>
                  <th>Date</th><th>Client</th><th>Address</th><th>BC</th>
                  <th>System Type</th><th>Substrate</th><th>Structure</th>
                  <th>Location</th><th>Built</th><th>Thick.</th><th>Glass</th><th>PS</th>
                </tr></thead>
                <tbody id="rgps-records-body">
                  <tr><td colspan="12" style="color:#71717a;">Loading…</td></tr>
                </tbody>
              </table>
            </div>
          </div>

        </div><!-- /#rgps-records-view -->

      </div>

    </div>
    <?php
    return ob_get_clean();
}

// ── AJAX: auth ───────────────────────────────────────────────────────
add_action( 'wp_ajax_rgps_auth',        'rgps_handle_auth' );
add_action( 'wp_ajax_nopriv_rgps_auth', 'rgps_handle_auth' );
function rgps_handle_auth() {
    check_ajax_referer( 'rgps_nonce', 'nonce' );

    $ip       = sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? '' );
    $rateKey  = 'rgps_rate_' . md5( $ip );
    $attempts = (int) get_transient( $rateKey );

    if ( $attempts >= 10 ) {
        wp_send_json( [ 'ok' => false, 'error' => 'Too many attempts. Try again in 15 minutes.' ], 429 );
    }

    $password = sanitize_text_field( $_POST['password'] ?? '' );
    $stored   = get_option( 'rgps_access_password', '' );

    if ( $password !== '' && $password === $stored ) {
        delete_transient( $rateKey );
        $token = bin2hex( random_bytes( 32 ) );
        set_transient( 'rgps_sess_' . $token, 1, 8 * HOUR_IN_SECONDS );
        wp_send_json( [ 'ok' => true, 'token' => $token ] );
    }

    set_transient( $rateKey, $attempts + 1, 15 * MINUTE_IN_SECONDS );
    wp_send_json( [ 'ok' => false, 'error' => 'Wrong password' ], 401 );
}

// ── AJAX: serve template bytes ───────────────────────────────────────
add_action( 'wp_ajax_rgps_template',        'rgps_handle_template' );
add_action( 'wp_ajax_nopriv_rgps_template', 'rgps_handle_template' );
function rgps_handle_template() {
    rgps_verify_token();

    $allowed = [
        'MP_PS1_2026.pdf',
        'MP_PS1_POOL_Template.pdf',
        'DD_PS1_2026.pdf',
        'Side_Channel_PS1_Template.pdf',
        'Top_Channel_PS1_Template.pdf',
        'PS3_Template.pdf',
    ];

    $name = sanitize_file_name( $_GET['name'] ?? '' );
    if ( ! in_array( $name, $allowed, true ) ) {
        wp_send_json( [ 'ok' => false, 'error' => 'Invalid template' ], 400 );
    }

    $path = RGPS_DIR . 'templates/' . $name;
    if ( ! file_exists( $path ) ) {
        wp_send_json( [ 'ok' => false, 'error' => 'Template not found: ' . $name ], 404 );
    }

    wp_send_json( [ 'ok' => true, 'data' => base64_encode( file_get_contents( $path ) ) ] );
}

// ── AJAX: log generation ─────────────────────────────────────────────
add_action( 'wp_ajax_rgps_log',        'rgps_handle_log' );
add_action( 'wp_ajax_nopriv_rgps_log', 'rgps_handle_log' );
function rgps_handle_log() {
    rgps_verify_token();
    global $wpdb;

    $allowed_systems    = [ 'mini-post', 'double-disc', 'side-channel', 'top-channel' ];
    $allowed_substrates = [ 'Timber', 'Concrete', 'Steel' ];
    $allowed_structures = [ 'Deck', 'Balcony', 'Pool', 'Pool Fence', 'Stair', 'Landing', 'Stair and Balcony' ];
    $allowed_locations  = [ 'Internal', 'External' ];
    $allowed_noe        = [ 'New', 'Existing' ];
    $allowed_thick      = [ '12', '13.2', '15' ];
    $allowed_glass      = [ 'Toughened', 'Laminated' ];

    $system_type = sanitize_text_field( $_POST['system_type']     ?? '' );
    $substrate   = sanitize_text_field( $_POST['substrate']       ?? '' );
    $structure   = sanitize_text_field( $_POST['structure']       ?? '' );
    $location    = sanitize_text_field( $_POST['location']        ?? '' );
    $noe         = sanitize_text_field( $_POST['new_or_existing'] ?? '' );
    $thickness   = sanitize_text_field( $_POST['thickness']       ?? '12' );
    $glass_type  = sanitize_text_field( $_POST['glass_type']      ?? 'Toughened' );

    if ( ! in_array( $system_type, $allowed_systems,    true ) ) wp_send_json( [ 'ok' => false ], 400 );
    if ( ! in_array( $substrate,   $allowed_substrates, true ) ) wp_send_json( [ 'ok' => false ], 400 );
    if ( ! in_array( $structure,   $allowed_structures, true ) ) wp_send_json( [ 'ok' => false ], 400 );
    if ( ! in_array( $location,    $allowed_locations,  true ) ) wp_send_json( [ 'ok' => false ], 400 );
    if ( ! in_array( $noe,         $allowed_noe,        true ) ) wp_send_json( [ 'ok' => false ], 400 );
    if ( ! in_array( $thickness,   $allowed_thick,      true ) ) $thickness = '12';
    if ( ! in_array( $glass_type,  $allowed_glass,      true ) ) $glass_type = 'Toughened';

    $wpdb->insert( $wpdb->prefix . 'rgps_records', [
        'created_at'      => current_time( 'mysql' ),
        'client_name'     => substr( sanitize_text_field( $_POST['client_name']     ?? '' ), 0, 200 ),
        'address'         => substr( sanitize_text_field( $_POST['address']         ?? '' ), 0, 300 ),
        'bc_number'       => substr( sanitize_text_field( $_POST['bc_number']       ?? '' ), 0, 50  ) ?: null,
        'lot_description' => substr( sanitize_text_field( $_POST['lot_description'] ?? '' ), 0, 300 ) ?: null,
        'system_type'     => $system_type,
        'substrate'       => $substrate,
        'structure'       => $structure,
        'location'        => $location,
        'new_or_existing' => $noe,
        'thickness'       => $thickness,
        'glass_type'      => $glass_type,
        'ps'              => in_array( $_POST['ps'] ?? '', [ 'PS1', 'PS3', 'Both' ], true ) ? $_POST['ps'] : 'PS1',
        'filename'        => substr( sanitize_file_name( $_POST['filename'] ?? '' ), 0, 400 ),
    ] );

    wp_send_json( [ 'ok' => true ] );
}

// ── AJAX: recent records ─────────────────────────────────────────────
add_action( 'wp_ajax_rgps_records',        'rgps_handle_records' );
add_action( 'wp_ajax_nopriv_rgps_records', 'rgps_handle_records' );
function rgps_handle_records() {
    rgps_verify_token();
    global $wpdb;

    $valid_limits = [ 10, 20, 50, 100 ];
    $per_page = (int) ( $_POST['per_page'] ?? 20 );
    if ( ! in_array( $per_page, $valid_limits, true ) ) $per_page = 20;
    $page   = max( 1, (int) ( $_POST['page'] ?? 1 ) );
    $offset = ( $page - 1 ) * $per_page;

    $table = $wpdb->prefix . 'rgps_records';
    $rows  = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM `{$table}` ORDER BY created_at DESC LIMIT %d OFFSET %d",
        $per_page, $offset
    ) );
    $total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `{$table}`" );

    wp_send_json( [ 'ok' => true, 'rows' => $rows, 'total' => $total ] );
}

// ── Token verification helper ────────────────────────────────────────
function rgps_verify_token() {
    $token = sanitize_text_field( $_REQUEST['token'] ?? '' );
    if ( ! $token || ! get_transient( 'rgps_sess_' . $token ) ) {
        wp_send_json( [ 'ok' => false, 'error' => 'Unauthorised' ], 401 );
        exit;
    }
}
