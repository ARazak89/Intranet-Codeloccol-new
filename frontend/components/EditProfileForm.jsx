import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '../schemas/profileSchema';
import styles from '../styles/profile.module.css';

export default function EditProfileForm({ user, onSubmit, onCancel, error, success }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      firstName: user?.firstName || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      gender: user?.gender || '',
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      nationality: user?.nationality || '',
      address: {
        street: user?.address?.street || '',
        city: user?.address?.city || '',
        country: user?.address?.country || '',
      },
      emergencyContact: {
        name: user?.emergencyContact?.name || '',
        relationship: user?.emergencyContact?.relationship || '',
        phone: user?.emergencyContact?.phone || '',
        address: user?.emergencyContact?.address || '',
      },
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="profile-form">
      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          <i className="bi bi-exclamation-circle me-2"></i>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-3" role="alert">
          <i className="bi bi-check-circle me-2"></i>
          {success}
        </div>
      )}

      {/* Section: Informations de base */}
      <h6 className="form-section-title">
        <i className="bi bi-person-badge me-2"></i>
        Informations de base
      </h6>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="name" className="form-label-custom">
            Nom *
          </label>
          <input
            type="text"
            className={`form-control ${styles.formControlCustom} ${
              errors.name ? 'is-invalid' : ''
            }`}
            id="name"
            placeholder="Nom de famille"
            {...register('name')}
          />
          {errors.name && (
            <div className="invalid-feedback d-block">
              {errors.name.message}
            </div>
          )}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="firstName" className="form-label-custom">
            Prénom
          </label>
          <input
            type="text"
            className={`form-control ${styles.formControlCustom} ${
              errors.firstName ? 'is-invalid' : ''
            }`}
            id="firstName"
            placeholder="Prénom(s)"
            {...register('firstName')}
          />
          {errors.firstName && (
            <div className="invalid-feedback d-block">
              {errors.firstName.message}
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="email" className="form-label-custom">
            Email *
          </label>
          <input
            type="email"
            className={`form-control ${styles.formControlCustom} ${
              errors.email ? 'is-invalid' : ''
            }`}
            id="email"
            placeholder="email@exemple.com"
            {...register('email')}
          />
          {errors.email && (
            <div className="invalid-feedback d-block">
              {errors.email.message}
            </div>
          )}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="phoneNumber" className="form-label-custom">
            Téléphone
          </label>
          <input
            type="tel"
            className={`form-control ${styles.formControlCustom} ${
              errors.phoneNumber ? 'is-invalid' : ''
            }`}
            id="phoneNumber"
            placeholder="+227 XX XX XX XX"
            {...register('phoneNumber')}
          />
          {errors.phoneNumber && (
            <div className="invalid-feedback d-block">
              {errors.phoneNumber.message}
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label htmlFor="gender" className="form-label-custom">
            Genre
          </label>
          <select
            className={`form-control ${styles.formControlCustom} ${
              errors.gender ? 'is-invalid' : ''
            }`}
            id="gender"
            {...register('gender')}
          >
            <option value="">Sélectionner</option>
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
            <option value="Autre">Autre</option>
          </select>
          {errors.gender && (
            <div className="invalid-feedback d-block">
              {errors.gender.message}
            </div>
          )}
        </div>

        <div className="col-md-4 mb-3">
          <label htmlFor="dateOfBirth" className="form-label-custom">
            Date de naissance
          </label>
          <input
            type="date"
            className={`form-control ${styles.formControlCustom} ${
              errors.dateOfBirth ? 'is-invalid' : ''
            }`}
            id="dateOfBirth"
            {...register('dateOfBirth')}
          />
          {errors.dateOfBirth && (
            <div className="invalid-feedback d-block">
              {errors.dateOfBirth.message}
            </div>
          )}
        </div>

        <div className="col-md-4 mb-3">
          <label htmlFor="nationality" className="form-label-custom">
            Nationalité
          </label>
          <input
            type="text"
            className={`form-control ${styles.formControlCustom} ${
              errors.nationality ? 'is-invalid' : ''
            }`}
            id="nationality"
            placeholder="Ex: Nigérienne"
            {...register('nationality')}
          />
          {errors.nationality && (
            <div className="invalid-feedback d-block">
              {errors.nationality.message}
            </div>
          )}
        </div>
      </div>

      {/* Section: Adresse */}
      <h6 className="form-section-title">
        <i className="bi bi-geo-alt me-2"></i>
        Adresse
      </h6>

      <div className="mb-3">
        <label htmlFor="addressStreet" className="form-label-custom">
          Quartier / Rue
        </label>
        <input
          type="text"
          className={`form-control ${styles.formControlCustom} ${
            errors.address?.street ? 'is-invalid' : ''
          }`}
          id="addressStreet"
          placeholder="Nom du quartier ou rue"
          {...register('address.street')}
        />
        {errors.address?.street && (
          <div className="invalid-feedback d-block">
            {errors.address.street.message}
          </div>
        )}
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="addressCity" className="form-label-custom">
            Ville
          </label>
          <input
            type="text"
            className={`form-control ${styles.formControlCustom} ${
              errors.address?.city ? 'is-invalid' : ''
            }`}
            id="addressCity"
            placeholder="Ex: Niamey"
            {...register('address.city')}
          />
          {errors.address?.city && (
            <div className="invalid-feedback d-block">
              {errors.address.city.message}
            </div>
          )}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="addressCountry" className="form-label-custom">
            Pays
          </label>
          <input
            type="text"
            className={`form-control ${styles.formControlCustom} ${
              errors.address?.country ? 'is-invalid' : ''
            }`}
            id="addressCountry"
            placeholder="Ex: Niger"
            {...register('address.country')}
          />
          {errors.address?.country && (
            <div className="invalid-feedback d-block">
              {errors.address.country.message}
            </div>
          )}
        </div>
      </div>

      {/* Section: Contact d'urgence */}
      <h6 className="form-section-title emergency">
        <i className="bi bi-telephone-fill me-2"></i>
        Contact d'urgence
      </h6>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="emergencyName" className="form-label-custom">
            Nom du contact
          </label>
          <input
            type="text"
            className={`form-control ${styles.formControlCustom} ${
              errors.emergencyContact?.name ? 'is-invalid' : ''
            }`}
            id="emergencyName"
            placeholder="Nom complet"
            {...register('emergencyContact.name')}
          />
          {errors.emergencyContact?.name && (
            <div className="invalid-feedback d-block">
              {errors.emergencyContact.name.message}
            </div>
          )}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="emergencyRelationship" className="form-label-custom">
            Lien avec vous
          </label>
          <input
            type="text"
            className={`form-control ${styles.formControlCustom} ${
              errors.emergencyContact?.relationship ? 'is-invalid' : ''
            }`}
            id="emergencyRelationship"
            placeholder="Ex: Père, Mère, Tuteur"
            {...register('emergencyContact.relationship')}
          />
          {errors.emergencyContact?.relationship && (
            <div className="invalid-feedback d-block">
              {errors.emergencyContact.relationship.message}
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="emergencyPhone" className="form-label-custom">
            Téléphone d'urgence
          </label>
          <input
            type="tel"
            className={`form-control ${styles.formControlCustom} ${
              errors.emergencyContact?.phone ? 'is-invalid' : ''
            }`}
            id="emergencyPhone"
            placeholder="+227 XX XX XX XX"
            {...register('emergencyContact.phone')}
          />
          {errors.emergencyContact?.phone && (
            <div className="invalid-feedback d-block">
              {errors.emergencyContact.phone.message}
            </div>
          )}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="emergencyAddress" className="form-label-custom">
            Adresse du contact
          </label>
          <input
            type="text"
            className={`form-control ${styles.formControlCustom} ${
              errors.emergencyContact?.address ? 'is-invalid' : ''
            }`}
            id="emergencyAddress"
            placeholder="Adresse complète"
            {...register('emergencyContact.address')}
          />
          {errors.emergencyContact?.address && (
            <div className="invalid-feedback d-block">
              {errors.emergencyContact.address.message}
            </div>
          )}
        </div>
      </div>

      <div className="d-flex gap-3 mt-4">
        <button
          type="submit"
          className={styles.submitBtnCustom}
          disabled={isSubmitting}
          style={{ flex: 1 }}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Enregistrement...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle"></i>
              Enregistrer les modifications
            </>
          )}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{ flex: 1 }}
        >
          <i className="bi bi-x-circle"></i>
          Annuler
        </button>
      </div>

      <style jsx>{`
        .profile-form {
          padding-right: 5px;
        }

        .form-section-title {
          color: #179349;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 15px;
          border-bottom: 2px solid #179349;
          padding-bottom: 8px;
          font-size: 16px;
        }

        /* Mode dark - titres de section */
        :global(.themed:not(.light)) .form-section-title {
          color: #1db558;
          border-bottom-color: #1db558;
        }

        .form-section-title.emergency {
          color: #F36F35;
          border-bottom-color: #F36F35;
        }

        :global(.themed:not(.light)) .form-section-title.emergency {
          color: #ff8556;
          border-bottom-color: #ff8556;
        }

        .form-section-title:first-of-type {
          margin-top: 0;
        }

        .form-label-custom {
          font-weight: 600;
          color: #333;
          font-size: 14px;
          margin-bottom: 5px;
        }

        /* Mode dark - labels de formulaire */
        :global(.themed:not(.light)) .form-label-custom {
          color: var(--text);
        }

        .invalid-feedback {
          font-size: 13px;
          margin-top: 5px;
        }
      `}</style>
    </form>
  );
}

