import {
    IonAvatar,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel, IonList,
    IonPage,
    IonRadio,
    IonRadioGroup,
    IonText,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from '@ionic/react'
import {
    arrowBackOutline,
    cameraOutline,
    closeOutline,
    personCircleOutline,
    peopleOutline,
    heartOutline,
    accessibilityOutline,
} from 'ionicons/icons';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {PersonRole} from '../../lib/domain'
import { client } from '../../lib/api'
import { useAppAuth } from '../../auth/AuthContext'

const roleOptions: Array<{
    value: PersonRole;
    label: string;
    description: string;
    icon: string;
}> = [
    {
        value: 'self',
        label: 'Myself',
        description: 'Track your own well-being',
        icon: personCircleOutline,
    },
    {
        value: 'child',
        label: 'Child',
        description: 'Track your child',
        icon: accessibilityOutline,
    },
    {
        value: 'spouse',
        label: 'Spouse',
        description: 'Track your partner',
        icon: heartOutline,
    },
    {
        value: 'parent',
        label: 'Parent',
        description: 'Track a parent',
        icon: peopleOutline,
    },
    {
        value: 'caregiver',
        label: 'Caregiver',
        description: 'Track a caregiver',
        icon: peopleOutline,
    },
    {
        value: 'other',
        label: 'Other',
        description: 'Someone else',
        icon: personCircleOutline,
    },
];

export default function PersonFormPage() {
    const router = useIonRouter();
    const { user } = useAppAuth();
    const { personId } = useParams<{ personId?: string }>();

    const isEditing = Boolean(personId);

    const photoInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<1 | 2>(isEditing ? 2 : 1);
    const [role, setRole] = useState<PersonRole>('child');
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

    function goBack() {
        if (step === 2 && !isEditing) {
            setStep(1);
            return;
        }

        router.goBack();
    }

    function close() {
        router.push('/people', 'back', 'replace');
    }

    function choosePhoto() {
        photoInputRef.current?.click();
    }

    function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setAvatarUrl(URL.createObjectURL(file));
    }

    async function save() {
        const trimmedDisplayName = displayName.trim();

        if (!trimmedDisplayName) {
            return;
        }

        if (!user) {
            throw new Error('Cannot save a person without an authenticated user');
        }

        const result = isEditing && personId
            ? await client.models.Person.update({
                id: personId,
                displayName: trimmedDisplayName,
                role,
                avatarUrl,
            })
            : await client.models.Person.create({
                displayName: trimmedDisplayName,
                role,
                avatarUrl,
                householdId: user.userId,
            });

        if (result.errors?.length) {
            throw new Error(result.errors[0].message);
        }

        router.push('/dashboard', 'forward', 'replace');
    }

    return (
        <IonPage>
            <IonHeader translucent>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton
                            fill="clear"
                            onClick={goBack}
                        >
                            <IonIcon icon={arrowBackOutline} />
                        </IonButton>
                    </IonButtons>

                    <IonTitle />

                    <IonButtons slot="end" className="person-photo-upload">
                        <IonButton
                            fill="clear"
                            onClick={close}
                        >
                            <IonIcon icon={closeOutline} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent
                fullscreen
            >
                {step === 1 ? (
                    <section>
                        <h1>Who are you tracking?</h1>
                        <p>You can always edit this later.</p>

                        <IonRadioGroup
                            value={role}
                            onIonChange={(event) => setRole(event.detail.value)}
                        >
                            {roleOptions.map((option) => (
                                <IonItem
                                    key={option.value}
                                    className="role-option"
                                    button
                                    detail={false}
                                    onClick={() => setRole(option.value)}
                                >
                                    <IonIcon
                                        slot="start"
                                        icon={option.icon}
                                    />

                                    <IonLabel>
                                        <h2>{option.label}</h2>
                                        <p>{option.description}</p>
                                    </IonLabel>

                                    <IonRadio
                                        slot="end"
                                        value={option.value}
                                    />
                                </IonItem>
                            ))}
                        </IonRadioGroup>

                        <IonButton
                            expand="block"
                            onClick={() => setStep(2)}
                        >
                            Next
                        </IonButton>
                    </section>
                ) : (
                    <section>
                        <h1>{isEditing ? 'Update person' : 'Let’s add some details'}</h1>
                        <p>This helps personalize their experience.</p>

                        <IonList>
                            <IonItem>
                                <IonInput label="Name" labelPlacement="stacked" placeholder="Enter text" onIonInput={(event) =>
                                    setDisplayName(event.detail.value ?? '')
                                } />
                            </IonItem>
                        </IonList>

                        <IonItem>
                            <IonAvatar slot="start">
                                <img alt={`avatar image for ${displayName}`} src={avatarUrl || `https://ui-avatars.com/api/?background=random&name=${displayName || role}`} />
                            </IonAvatar>
                            <IonLabel>
                                <h2>Photo</h2>
                                <p>Add a profile picture</p>
                            </IonLabel>

                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handlePhotoChange}
                            />

                            <IonButton
                                slot="end"
                                fill="clear"
                                aria-label="Choose photo"
                                onClick={choosePhoto}
                            >
                                <IonIcon
                                    slot="icon-only"
                                    icon={cameraOutline}
                                />
                            </IonButton>
                        </IonItem>

                        <div className="person-form__footer">
                            <IonButton
                                expand="block"
                                disabled={!displayName.trim()}
                                onClick={save}
                            >
                                {isEditing ? 'Save Changes' : 'Next'}
                            </IonButton>
                        </div>
                    </section>
                )}
            </IonContent>
        </IonPage>
    );
}

function getInitials(value: string): string {
    return value
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}